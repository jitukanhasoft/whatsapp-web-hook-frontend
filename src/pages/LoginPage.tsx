import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Forum, Lock, Person, Visibility, VisibilityOff } from '@mui/icons-material';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b141a 0%, #111b21 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Outfit", "Inter", sans-serif',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '220px',
          background: '#00a884',
          zIndex: 1
        }
      }}
    >
      <Container maxWidth="xs" sx={{ zIndex: 2, position: 'relative' }}>
        {/* Logo and Header Header */}
        <Box sx={{ textAlign: 'center', mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box
            sx={{
              backgroundColor: '#fff',
              borderRadius: '50%',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              mb: 2,
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.08)'
              }
            }}
          >
            <Forum sx={{ fontSize: 48, color: '#00a884' }} />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#f0f2f5',
              letterSpacing: '-0.5px',
              fontFamily: 'inherit'
            }}
          >
            WhatsApp Business
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{ color: '#8696a0', mt: 0.5, letterSpacing: '0.5px' }}
          >
            REALTIME CHAT CONSOLE
          </Typography>
        </Box>

        {/* Form Card */}
        <Card
          elevation={24}
          sx={{
            p: 4,
            borderRadius: '16px',
            backgroundColor: '#111b21',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              fontWeight: 600,
              color: '#e9edef',
              textAlign: 'center',
              fontFamily: 'inherit'
            }}
          >
            Sign In to Dashboard
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: '8px',
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                color: '#f2b5b5',
                border: '1px solid rgba(211, 47, 47, 0.3)',
                '& .MuiAlert-icon': {
                  color: '#f2b5b5'
                }
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username Input */}
            <TextField
              fullWidth
              label="Admin Username"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{
                mb: 3,
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

            {/* Password Input */}
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                mb: 4,
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
                      <Lock sx={{ color: '#8696a0' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#8696a0' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />

            {/* Submit Button */}
            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: '8px',
                backgroundColor: '#00a884',
                color: '#111b21',
                fontWeight: 700,
                fontSize: '1rem',
                fontFamily: 'inherit',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(0, 168, 132, 0.4)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: '#008f72',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(0, 168, 132, 0.6)'
                },
                '&:active': {
                  transform: 'translateY(0)'
                },
                '&.Mui-disabled': {
                  backgroundColor: '#2f3b43',
                  color: '#8696a0'
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#111b21' }} />
              ) : (
                'Access Dashboard'
              )}
            </Button>
          </form>
        </Card>

        {/* Footer info credentials */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#8696a0', fontSize: '0.85rem' }}>
            Demo Account: <strong>admin</strong> / <strong>admin123</strong>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;
