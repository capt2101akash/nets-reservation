import { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Drawer,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Avatar, Menu, MenuItem, Divider, useMediaQuery, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { label: 'Home', path: '/', icon: <HomeIcon /> },
  { label: 'Book a Net', path: '/book', icon: <CalendarMonthIcon />, protected: true },
  { label: 'My Bookings', path: '/my-bookings', icon: <BookmarkIcon />, protected: true },
];

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = () => {
    logout();
    setAnchorEl(null);
    navigate('/');
  };

  const visibleLinks = navLinks.filter(l => !l.protected || user);

  const NavItems = () => (
    <>
      {visibleLinks.map(link => (
        <ListItem key={link.path} disablePadding>
          <ListItemButton
            component={RouterLink}
            to={link.path}
            selected={location.pathname === link.path}
            onClick={() => setDrawerOpen(false)}
            sx={{
              borderRadius: 2,
              mx: 1,
              '&.Mui-selected': {
                backgroundColor: 'rgba(46,125,50,0.2)',
                color: 'primary.light',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{link.icon}</ListItemIcon>
            <ListItemText primary={link.label} />
          </ListItemButton>
        </ListItem>
      ))}
      {isAdmin && (
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/admin"
            selected={location.pathname === '/admin'}
            onClick={() => setDrawerOpen(false)}
            sx={{
              borderRadius: 2, mx: 1,
              '&.Mui-selected': { backgroundColor: 'rgba(245,127,23,0.15)', color: 'secondary.light' }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}><AdminPanelSettingsIcon /></ListItemIcon>
            <ListItemText primary="Admin" />
          </ListItemButton>
        </ListItem>
      )}
    </>
  );

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}

          <Box
            component={RouterLink}
            to="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit', flexGrow: isMobile ? 1 : 0, mr: 4 }}
          >
            <SportsCricketIcon sx={{ color: 'primary.light', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={700} sx={{ background: 'linear-gradient(90deg, #4caf50, #ffb300)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Northridge Nets
            </Typography>
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
              {visibleLinks.map(link => (
                <Button
                  key={link.path}
                  component={RouterLink}
                  to={link.path}
                  color={location.pathname === link.path ? 'primary' : 'inherit'}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: location.pathname === link.path ? 'rgba(46,125,50,0.15)' : 'transparent',
                  }}
                >
                  {link.label}
                </Button>
              ))}
              {isAdmin && (
                <Button
                  component={RouterLink}
                  to="/admin"
                  color={location.pathname === '/admin' ? 'secondary' : 'inherit'}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: location.pathname === '/admin' ? 'rgba(245,127,23,0.15)' : 'transparent',
                  }}
                >
                  Admin
                </Button>
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user ? (
              <>
                <IconButton onClick={e => setAnchorEl(e.currentTarget)} size="small">
                  <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.dark', fontSize: '0.9rem' }}>
                    {user.name?.[0]?.toUpperCase()}
                  </Avatar>
                </IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                  PaperProps={{ sx: { mt: 1, minWidth: 180 } }}
                >
                  <Box px={2} py={1}>
                    <Typography variant="subtitle2" fontWeight={600}>{user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={handleLogout} sx={{ gap: 1 }}>
                    <LogoutIcon fontSize="small" /> Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button component={RouterLink} to="/login" variant="outlined" color="primary" size="small">Login</Button>
                <Button component={RouterLink} to="/register" variant="contained" color="primary" size="small">Sign Up</Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 260, bgcolor: 'background.paper' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <SportsCricketIcon sx={{ color: 'primary.light' }} />
          <Typography fontWeight={700}>Northridge Nets</Typography>
        </Box>
        <List sx={{ pt: 1 }}>
          <NavItems />
        </List>
        {user && (
          <>
            <Divider sx={{ mt: 'auto' }} />
            <Box px={2} py={1.5}>
              <Typography variant="caption" color="text.secondary">Signed in as</Typography>
              <Typography variant="body2" fontWeight={600}>{user.name}</Typography>
            </Box>
            <Box px={2} pb={2}>
              <Button fullWidth variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          </>
        )}
      </Drawer>
    </>
  );
}
