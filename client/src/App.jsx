import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Book from './pages/Book';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/book" element={
                <ProtectedRoute><Book /></ProtectedRoute>
              } />
              <Route path="/my-bookings" element={
                <ProtectedRoute><MyBookings /></ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
              } />
            </Routes>
          </Box>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
