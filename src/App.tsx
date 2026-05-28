import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ChatDashboard from './pages/ChatDashboard';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';

// Curated elegant Dark Teal theme for high-fidelity WhatsApp aesthetic
const whatsappDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00a884', // WhatsApp Teal
      contrastText: '#111b21'
    },
    background: {
      default: '#111b21',
      paper: '#202c33'
    },
    text: {
      primary: '#e9edef',
      secondary: '#8696a0'
    }
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
  }
});

const AppNavigation: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111b21'
        }}
      >
        <CircularProgress sx={{ color: '#00a884' }} />
      </Box>
    );
  }

  return isAuthenticated ? <ChatDashboard /> : <LoginPage />;
};

function App() {
  return (
    <ThemeProvider theme={whatsappDarkTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppNavigation />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
