import { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, Divider, InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isVerifiedParam = searchParams.get('verified') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/book');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1b2a1b 0%, #0d1117 60%)', p: 2 }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420 }}>
        <Box textAlign="center" mb={3}>
          <SportsCricketIcon sx={{ fontSize: 48, color: 'primary.light' }} />
          <Typography variant="h4" fontWeight={700} mt={1}>Welcome Back</Typography>
          <Typography color="text.secondary">Sign in to your Northridge Nets account</Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            {isVerifiedParam && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Email verified successfully! You can now log in.
              </Alert>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth label="Email" type="email" margin="normal"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon color="disabled" /></InputAdornment> }}
                required
              />
              <TextField
                fullWidth label="Password" margin="normal"
                type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon color="disabled" /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                required
              />
              <Button
                type="submit" fullWidth variant="contained" color="primary" size="large"
                disabled={loading} sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.secondary">Don't have an account?</Typography>
            </Divider>
            <Button fullWidth variant="outlined" color="primary" component={RouterLink} to="/register">
              Create an Account
            </Button>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={2}>
          Back to <RouterLink to="/" style={{ color: '#4caf50' }}>Home</RouterLink>
        </Typography>
      </motion.div>
    </Box>
  );
}
