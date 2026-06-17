import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
}
