import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Chip, Stack,
  Button, Alert, Snackbar, Divider, CircularProgress, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import dayjs from 'dayjs';

function formatTime(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function BookingCard({ booking, onCancel }) {
  const isUpcoming = dayjs(`${booking.date}T${booking.start_time}`).isAfter(dayjs());
  const hoursUntil = dayjs(`${booking.date}T${booking.start_time}`).diff(dayjs(), 'hour');
  const canCancel = (booking.status === 'confirmed' && hoursUntil >= 24) || booking.status === 'on_hold';

  const statusColor = booking.status === 'confirmed'
    ? isUpcoming ? 'success' : 'default'
    : booking.status === 'on_hold' ? 'warning' : 'error';

  const statusLabel = booking.status === 'cancelled'
    ? 'Cancelled'
    : booking.status === 'on_hold' ? 'On Hold (Awaiting Payment)' : isUpcoming ? 'Upcoming' : 'Completed';

  return (
    <Card sx={{
      border: '1px solid',
      borderColor: booking.status === 'cancelled' ? 'divider' : booking.status === 'on_hold' ? 'warning.light' : isUpcoming ? 'rgba(46,125,50,0.3)' : 'divider',
      opacity: booking.status === 'cancelled' ? 0.6 : 1,
    }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={2}>
          <Box flexGrow={1}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap" useFlexGap gap={1}>
              {booking.session_type === 'nets_bowling'
                ? <PrecisionManufacturingIcon sx={{ color: 'secondary.light', fontSize: 20 }} />
                : <SportsCricketIcon sx={{ color: 'primary.light', fontSize: 20 }} />
              }
              <Typography fontWeight={600}>
                {booking.session_type === 'nets_bowling' ? 'Nets + Bowling Machine' : 'Nets Only'}
              </Typography>
              <Chip label={statusLabel} color={statusColor} size="small" />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
              <CalendarMonthIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">{dayjs(booking.date).format('dddd, MMMM D, YYYY')}</Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary" mt={0.5}>
              <AccessTimeIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
              </Typography>
            </Stack>

            {booking.status === 'on_hold' && (
              <Alert severity="warning" icon={false} sx={{ mt: 2, py: 0.5, px: 1.5 }}>
                Please send payment to our mobile number{' '}<strong>+1 555-NETS-PAY</strong>{' '}to confirm your booking. Mention Booking ID{' '}<strong>#{booking.id}</strong>.
              </Alert>
            )}
          </Box>

          <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
            <Typography variant="h5" fontWeight={800} color="secondary.main">
              ${booking.price.toFixed(2)}
            </Typography>
            {canCancel && (
              <Button
                variant="outlined" color="error" size="small"
                startIcon={<CancelIcon />}
                onClick={() => onCancel(booking)}
              >
                Cancel
              </Button>
            )}
            {booking.status === 'confirmed' && !isUpcoming && (
              <Typography variant="caption" color="text.secondary">Session completed</Typography>
            )}
            {booking.status === 'confirmed' && isUpcoming && hoursUntil < 24 && (
              <Typography variant="caption" color="warning.main">Cancellation window passed</Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchBookings = () => {
    setLoading(true);
    api.get('/bookings/me')
      .then(res => setBookings(res.data.bookings))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  const now = dayjs();
  const upcoming = bookings.filter(b => (b.status === 'confirmed' || b.status === 'on_hold') && dayjs(`${b.date}T${b.start_time}`).isAfter(now));
  const past = bookings.filter(b => b.status === 'cancelled' || (b.status !== 'cancelled' && dayjs(`${b.date}T${b.start_time}`).isBefore(now)));

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.delete(`/bookings/${cancelTarget.id}`);
      setSnack({ open: true, message: 'Booking cancelled successfully.', severity: 'success' });
      fetchBookings();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || 'Cancellation failed.', severity: 'error' });
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const displayedBookings = tab === 0 ? upcoming : past;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>My Bookings</Typography>
            <Typography color="text.secondary">Manage your cricket net sessions</Typography>
          </Box>
          <Button
            variant="contained" color="primary" component={RouterLink} to="/book"
            startIcon={<AddIcon />}
          >
            New Booking
          </Button>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label={`Upcoming (${upcoming.length})`} />
          <Tab label={`History (${past.length})`} />
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : displayedBookings.length === 0 ? (
          <Box textAlign="center" py={8}>
            <SportsCricketIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {tab === 0 ? 'No upcoming bookings' : 'No past bookings'}
            </Typography>
            {tab === 0 && (
              <Button component={RouterLink} to="/book" variant="contained" color="primary" sx={{ mt: 2 }}>
                Book a Session
              </Button>
            )}
          </Box>
        ) : (
          <Stack spacing={2}>
            {displayedBookings.map((booking, i) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <BookingCard booking={booking} onCancel={setCancelTarget} />
              </motion.div>
            ))}
          </Stack>
        )}
      </Container>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)}>
        <DialogTitle>Cancel Booking?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel your {cancelTarget?.session_type === 'nets_bowling' ? 'Nets + Bowling Machine' : 'Nets Only'} session{' '}
            on{' '}<strong>{cancelTarget && dayjs(cancelTarget.date).format('MMMM D, YYYY')}</strong>{' '}at{' '}<strong>{cancelTarget && formatTime(cancelTarget.start_time)}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Keep Booking</Button>
          <Button color="error" variant="contained" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? <CircularProgress size={20} color="inherit" /> : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
