import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, Divider, InputAdornment, IconButton, CircularProgress, Grid
} from '@mui/material';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PhoneIcon from '@mui/icons-material/Phone';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      const res = await api.post('/auth/register', payload);
      login(res.data.token, res.data.user);
      navigate('/book');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1b2a1b 0%, #0d1117 60%)', p: 2 }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 480 }}>
        <Box textAlign="center" mb={3}>
          <SportsCricketIcon sx={{ fontSize: 48, color: 'primary.light' }} />
          <Typography variant="h4" fontWeight={700} mt={1}>Create Account</Typography>
          <Typography color="text.secondary">Join Northridge Nets and start booking</Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth label="Full Name" margin="normal" required
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon color="disabled" /></InputAdornment> }}
              />
              <TextField
                fullWidth label="Email" type="email" margin="normal" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon color="disabled" /></InputAdornment> }}
              />
              <TextField
                fullWidth label="Phone (optional)" margin="normal"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon color="disabled" /></InputAdornment> }}
              />
              <TextField
                fullWidth label="Password" margin="normal" required
                type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                helperText="Minimum 6 characters"
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
              />
              <TextField
                fullWidth label="Confirm Password" margin="normal" required
                type={showPassword ? 'text' : 'password'}
                value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon color="disabled" /></InputAdornment> }}
              />
              <Button
                type="submit" fullWidth variant="contained" color="primary" size="large"
                disabled={loading} sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.secondary">Already have an account?</Typography>
            </Divider>
            <Button fullWidth variant="outlined" color="primary" component={RouterLink} to="/login">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
