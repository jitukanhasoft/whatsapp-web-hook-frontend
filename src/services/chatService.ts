import api from './api';

export interface User {
  id: number;
  phone: string;
  name: string;
  createdAt: string;
}

export interface Chat {
  id: number;
  userId: number;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  user: User;
}

export interface Message {
  id: number;
  waMessageId: string | null;
  userId: number;
  fromNumber: string;
  toNumber: string;
  message: string;
  status: string;
  isOutgoing: boolean;
  createdAt: string;
}

/**
 * Fetch all active chats sorted by recency
 */
export async function getChats(): Promise<Chat[]> {
  const response = await api.get<Chat[]>('/api/chats');
  return response.data;
}

/**
 * Fetch conversation history for a given phone number
 */
export async function getMessages(phone: string): Promise<Message[]> {
  const response = await api.get<Message[]>(`/api/messages/${phone}`);
  return response.data;
}

/**
 * Send an outbound text message
 */
export async function sendMessage(to: string, message: string): Promise<{ success: boolean; message: Message; chat: Chat }> {
  const response = await api.post<{ success: boolean; message: Message; chat: Chat }>('/api/messages/send', { to, message });
  return response.data;
}
