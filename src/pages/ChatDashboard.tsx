import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { socket } from '../sockets/socket';
import {
  getChats,
  getMessages,
  sendMessage
} from '../services/chatService';
import type { Chat, Message } from '../services/chatService';
import {
  Box,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Badge,
  IconButton,
  Button,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Search,
  Send,
  MoreVert,
  Chat as ChatIcon,
  Logout,
  Phone,
  Person,
  Done,
  DoneAll
} from '@mui/icons-material';

const ChatDashboard: React.FC = () => {
  const { logout, user: authUser } = useAuth();
  
  // Data States
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading & Action States
  const [chatsLoading, setChatsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  
  // New Chat Dialog
  const [openNewChatDialog, setOpenNewChatDialog] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Chats on Mount
  const loadChats = async () => {
    try {
      setChatsLoading(true);
      const data = await getChats();
      setChats(data);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setChatsLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  // Socket.IO Integration for Real-Time Synchronization
  useEffect(() => {
    // Connect to socket server
    socket.connect();

    // Handle incoming messages from webhook
    socket.on('message_received', (newMessage: Message) => {
      // If message belongs to the active conversation, append it!
      if (activeChat && newMessage.userId === activeChat.userId) {
        setMessages((prev) => {
          // Prevent duplicates just in case
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        // Trigger GET request to reset unreadCount on backend
        getMessages(activeChat.user.phone).catch(console.error);
      }
    });

    // Handle outgoing message confirmation
    socket.on('message_sent', (sentMessage: Message) => {
      if (activeChat && sentMessage.userId === activeChat.userId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMessage.id)) return prev;
          return [...prev, sentMessage];
        });
      }
    });

    // Handle sidebar updates (last message, timestamp, unread increments)
    socket.on('chat_updated', (updatedChat: Chat) => {
      setChats((prevChats) => {
        // Remove existing entry and place the updated chat at the top
        const filtered = prevChats.filter((c) => c.userId !== updatedChat.userId);
        
        // If we are currently actively viewing this chat, force its unread count to 0 in local state
        const adjustedChat = activeChat && activeChat.userId === updatedChat.userId 
          ? { ...updatedChat, unreadCount: 0 }
          : updatedChat;

        return [adjustedChat, ...filtered];
      });
    });

    return () => {
      socket.off('message_received');
      socket.off('message_sent');
      socket.off('chat_updated');
      socket.disconnect();
    };
  }, [activeChat]);

  // Load Messages when Active Chat Changes
  useEffect(() => {
    if (!activeChat) return;

    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        const data = await getMessages(activeChat.user.phone);
        setMessages(data);

        // Reset unread count locally in sidebar for smoothness
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChat.id ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [activeChat]);

  // Send Message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !newMessageText.trim() || sending) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    try {
      await sendMessage(activeChat.user.phone, textToSend);
    } catch (err) {
      console.error('Error dispatching message:', err);
      // Put text back if sending failed
      setNewMessageText(textToSend);
    } finally {
      setSending(false);
    }
  };

  // Launch New Chat with arbitrary number
  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim()) return;

    const cleanPhone = newChatPhone.replace(/\D/g, ''); // keep only digits
    if (!cleanPhone) return;

    setOpenNewChatDialog(false);

    try {
      // Send an initial greeting message or just create/retrieve the chat
      const initialMessage = `Hello, this is WhatsApp Business Chat.`;
      
      const response = await sendMessage(cleanPhone, initialMessage);
      
      // Update sidebar state
      setChats((prev) => {
        const exists = prev.some((c) => c.userId === response.chat.userId);
        if (exists) {
          return [response.chat, ...prev.filter((c) => c.userId !== response.chat.userId)];
        }
        return [response.chat, ...prev];
      });

      // Set active
      setActiveChat(response.chat);
      setNewChatPhone('');
      setNewChatName('');
    } catch (err) {
      console.error('Error creating new conversation:', err);
    }
  };

  // Filter chats by query
  const filteredChats = chats.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.user.name.toLowerCase().includes(query) ||
      c.user.phone.includes(query) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(query))
    );
  });

  // Helper: Format Timestamp beautifully
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#111b21', // WhatsApp main dark background
        color: '#e9edef',
        fontFamily: '"Outfit", "Inter", sans-serif'
      }}
    >
      {/* 1. LEFT SIDEBAR PANEL */}
      <Box
        sx={{
          width: { xs: '100%', sm: '380px', md: '420px' },
          flexShrink: 0,
          display: { xs: activeChat ? 'none' : 'flex', sm: 'flex' },
          flexDirection: 'column',
          borderRight: '1px solid #2f3b43',
          backgroundColor: '#111b21'
        }}
      >
        {/* Sidebar Header Profile */}
        <Box
          sx={{
            height: '60px',
            backgroundColor: '#202c33',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: '#00a884',
                color: '#111b21',
                fontWeight: 700,
                width: 40,
                height: 40
              }}
            >
              {authUser?.username?.[0].toUpperCase() || 'A'}
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e9edef' }}>
              Admin Console
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              onClick={() => setOpenNewChatDialog(true)}
              sx={{ color: '#aebac1', '&:hover': { color: '#00a884' } }}
              title="Start New Chat"
            >
              <ChatIcon />
            </IconButton>
            <IconButton
              onClick={logout}
              sx={{ color: '#aebac1', '&:hover': { color: '#ef5350' } }}
              title="Logout"
            >
              <Logout />
            </IconButton>
          </Box>
        </Box>

        {/* Sidebar Search Bar */}
        <Box sx={{ p: 1.5, backgroundColor: '#111b21' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#8696a0', fontSize: '20px' }} />
                  </InputAdornment>
                )
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#e9edef',
                backgroundColor: '#202c33',
                borderRadius: '8px',
                '& fieldset': { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' }
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#8696a0',
                opacity: 1
              }
            }}
          />
        </Box>

        <Divider sx={{ borderColor: '#222e35' }} />

        {/* Sidebar Chat List */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#111b21' }}>
          {chatsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress sx={{ color: '#00a884' }} />
            </Box>
          ) : filteredChats.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#8696a0' }}>
              <Typography variant="body2">No conversations found.</Typography>
              <Button
                variant="outlined"
                onClick={() => setOpenNewChatDialog(true)}
                sx={{
                  mt: 2,
                  borderColor: '#00a884',
                  color: '#00a884',
                  textTransform: 'none',
                  borderRadius: '18px',
                  '&:hover': {
                    borderColor: '#008f72',
                    backgroundColor: 'rgba(0, 168, 132, 0.08)'
                  }
                }}
              >
                Send first message
              </Button>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredChats.map((chat) => {
                const isSelected = activeChat?.id === chat.id;
                return (
                  <ListItemButton
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    selected={isSelected}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid #222e35',
                      backgroundColor: isSelected ? '#2a3942' : 'transparent',
                      '&:hover': {
                        backgroundColor: isSelected ? '#2a3942' : '#202c33'
                      },
                      '&.Mui-selected': {
                        backgroundColor: '#2a3942',
                        '&:hover': {
                          backgroundColor: '#2a3942'
                        }
                      }
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 52 }}>
                      <Avatar
                        sx={{
                          bgcolor: isSelected ? '#00a884' : '#51636f',
                          color: '#e9edef',
                          width: 44,
                          height: 44,
                          fontWeight: 600
                        }}
                      >
                        {chat.user.name[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: chat.unreadCount > 0 ? 700 : 500,
                              color: '#e9edef',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              maxWidth: '180px'
                            }}
                          >
                            {chat.user.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: chat.unreadCount > 0 ? '#00a884' : '#8696a0',
                              fontWeight: chat.unreadCount > 0 ? 600 : 400
                            }}
                          >
                            {formatTime(chat.lastMessageAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#8696a0',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              maxWidth: '220px',
                              fontWeight: chat.unreadCount > 0 ? 600 : 400
                            }}
                          >
                            {chat.lastMessage || 'Start a conversation'}
                          </Typography>
                          {chat.unreadCount > 0 && (
                            <Badge
                              badgeContent={chat.unreadCount}
                              sx={{
                                '& .MuiBadge-badge': {
                                  backgroundColor: '#25d366',
                                  color: '#111b21',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  minWidth: 20,
                                  height: 20
                                }
                              }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>
      </Box>

      {/* 2. RIGHT CONVERSATION PANEL */}
      <Box
        sx={{
          flexGrow: 1,
          display: { xs: activeChat ? 'flex' : 'none', sm: 'flex' },
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#0b141a', // WhatsApp chat screen background
          position: 'relative'
        }}
      >
        {activeChat ? (
          <>
            {/* Conversation Active Header */}
            <Box
              sx={{
                height: '60px',
                backgroundColor: '#202c33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                borderBottom: '1px solid #2f3b43',
                zIndex: 10
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Back button for responsive xs mobile screens */}
                <Button
                  onClick={() => setActiveChat(null)}
                  sx={{
                    display: { xs: 'inline-flex', sm: 'none' },
                    minWidth: 'auto',
                    p: 0,
                    mr: 1,
                    color: '#00a884'
                  }}
                >
                  ←
                </Button>

                <Avatar
                  sx={{
                    bgcolor: '#00a884',
                    color: '#111b21',
                    fontWeight: 600,
                    width: 40,
                    height: 40
                  }}
                >
                  {activeChat.user.name[0].toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e9edef', lineHeight: 1.2 }}>
                    {activeChat.user.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#8696a0' }}>
                    +{activeChat.user.phone}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton sx={{ color: '#aebac1' }}>
                  <Search />
                </IconButton>
                <IconButton sx={{ color: '#aebac1' }}>
                  <MoreVert />
                </IconButton>
              </Box>
            </Box>

            {/* Scrollable Conversation History */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                px: 4,
                py: 3,
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', // WhatsApp signature pattern
                backgroundBlendMode: 'overlay',
                backgroundColor: '#0b141a',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5
              }}
            >
              {messagesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress sx={{ color: '#00a884' }} />
                </Box>
              ) : messages.length === 0 ? (
                <Box
                  sx={{
                    alignSelf: 'center',
                    backgroundColor: '#182229',
                    px: 3,
                    py: 1.5,
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    textAlign: 'center',
                    mt: '20vh'
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#8696a0' }}>
                    This is the start of your chat history.
                  </Typography>
                </Box>
              ) : (
                messages.map((msg) => {
                  const isOut = msg.isOutgoing;
                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        alignSelf: isOut ? 'flex-end' : 'flex-start',
                        maxWidth: '65%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.25,
                          borderRadius: isOut ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
                          backgroundColor: isOut ? '#005c4b' : '#202c33', // WhatsApp bubbles
                          color: '#e9edef',
                          position: 'relative',
                          wordBreak: 'break-word',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        <Typography variant="body1" sx={{ pr: 6, fontSize: '0.95rem' }}>
                          {msg.message}
                        </Typography>

                        {/* Timestamp & Status Double Ticks */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 0.5,
                            mt: 0.5,
                            float: 'right'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#8696a0', fontSize: '0.72rem' }}>
                            {formatTime(msg.createdAt)}
                          </Typography>
                          {isOut && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {msg.status === 'read' ? (
                                <DoneAll sx={{ fontSize: 16, color: '#53bdeb' }} />
                              ) : (
                                <Done sx={{ fontSize: 16, color: '#8696a0' }} />
                              )}
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    </Box>
                  );
                })
              )}
              {/* Dummy Anchor for Scrolling */}
              <div ref={messagesEndRef} />
            </Box>

            {/* Outgoing Message Input Bar */}
            <Box
              component="form"
              onSubmit={handleSendMessage}
              sx={{
                height: '62px',
                backgroundColor: '#202c33',
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                gap: 1.5
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#e9edef',
                    backgroundColor: '#2a3942',
                    borderRadius: '8px',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' }
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: '#8696a0',
                    opacity: 1
                  }
                }}
              />
              <IconButton
                type="submit"
                disabled={!newMessageText.trim() || sending}
                sx={{
                  backgroundColor: newMessageText.trim() ? '#00a884' : 'transparent',
                  color: newMessageText.trim() ? '#111b21' : '#8696a0',
                  '&:hover': {
                    backgroundColor: newMessageText.trim() ? '#008f72' : 'transparent'
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'transparent',
                    color: '#8696a0'
                  }
                }}
              >
                {sending ? <CircularProgress size={20} sx={{ color: '#111b21' }} /> : <Send />}
              </IconButton>
            </Box>
          </>
        ) : (
          /* Blank Mockup Screen before selecting a user chat */
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#222e35',
              backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
              backgroundBlendMode: 'overlay',
              opacity: 0.85
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
                p: 4,
                backgroundColor: '#111b21',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                maxWidth: '480px'
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 2,
                  bgcolor: '#202c33',
                  borderRadius: '50%',
                  color: '#00a884',
                  mb: 3,
                  fontSize: 54
                }}
              >
                <DoneAll sx={{ fontSize: 56 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f0f2f5', mb: 1 }}>
                WhatsApp Web
              </Typography>
              <Typography variant="body1" sx={{ color: '#8696a0', mb: 3, px: 2 }}>
                Send and receive messages instantly. Select any contact from the left sidebar panel or start a new conversation to begin real-time messaging.
              </Typography>
              <Button
                variant="contained"
                onClick={() => setOpenNewChatDialog(true)}
                startIcon={<ChatIcon />}
                sx={{
                  bgcolor: '#00a884',
                  color: '#111b21',
                  fontWeight: 700,
                  px: 4,
                  py: 1.25,
                  borderRadius: '20px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(0, 168, 132, 0.3)',
                  '&:hover': {
                    bgcolor: '#008f72',
                    boxShadow: '0 6px 18px rgba(0, 168, 132, 0.5)'
                  }
                }}
              >
                Start New Conversation
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* 3. NEW CONVERSATION DIALOG MODAL */}
      <Dialog
        open={openNewChatDialog}
        onClose={() => setOpenNewChatDialog(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              backgroundColor: '#111b21',
              color: '#e9edef',
              border: '1px solid rgba(255,255,255,0.05)',
              width: '100%',
              maxWidth: '400px'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #222e35', pb: 1.5 }}>
          Start New Conversation
        </DialogTitle>
        <form onSubmit={handleCreateNewChat}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
            <TextField
              fullWidth
              label="Recipient Phone Number"
              placeholder="e.g. 919999999999 (include country code)"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#e9edef',
                  borderRadius: '8px',
                  '& fieldset': { borderColor: '#2f3b43' },
                  '&:hover fieldset': { borderColor: '#8696a0' },
                  '&.Mui-focused fieldset': { borderColor: '#00a884' }
                },
                '& .MuiInputLabel-root': {
                  color: '#8696a0',
                  '&.Mui-focused': { color: '#00a884' }
                }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone sx={{ color: '#8696a0' }} />
                    </InputAdornment>
                  )
                }
              }}
              required
            />
            <TextField
              fullWidth
              label="Recipient Name (Optional)"
              placeholder="e.g. John Doe"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#e9edef',
                  borderRadius: '8px',
                  '& fieldset': { borderColor: '#2f3b43' },
                  '&:hover fieldset': { borderColor: '#8696a0' },
                  '&.Mui-focused fieldset': { borderColor: '#00a884' }
                },
                '& .MuiInputLabel-root': {
                  color: '#8696a0',
                  '&.Mui-focused': { color: '#00a884' }
                }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: '#8696a0' }} />
                    </InputAdornment>
                  )
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid #222e35' }}>
            <Button
              onClick={() => setOpenNewChatDialog(false)}
              sx={{
                color: '#8696a0',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { color: '#e9edef' }
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: '#00a884',
                color: '#111b21',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '8px',
                px: 3,
                '&:hover': {
                  bgcolor: '#008f72'
                }
              }}
            >
              Start Chat
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ChatDashboard;
