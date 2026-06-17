import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Button, Stack,
  Stepper, Step, StepLabel, Alert, Snackbar, CircularProgress,
  ToggleButtonGroup, ToggleButton, Divider, Chip, Paper
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import SlotGrid from '../components/SlotGrid';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const STEPS = ['Choose Date', 'Session Type', 'Pick Time Slots', 'Confirm'];

const SESSION_TYPES = [
  {
    value: 'nets_only',
    label: 'Nets Only',
    price: 30,
    icon: <SportsCricketIcon sx={{ fontSize: 32 }} />,
    desc: 'Full cricket net access. Bring your own gear.',
    color: 'primary',
  },
  {
    value: 'nets_bowling',
    label: 'Nets + Bowling Machine',
    price: 50,
    icon: <PrecisionManufacturingIcon sx={{ fontSize: 32 }} />,
    desc: 'Net access + professional bowling machine. Adjustable speed & line.',
    color: 'secondary',
  },
];

function formatTime(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function Book() {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sessionType, setSessionType] = useState('');
  const [selection, setSelection] = useState(null); // { start_time, end_time, durationHrs, price }
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  // Fetch availability when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelection(null);
    api.get(`/bookings/availability?date=${selectedDate.format('YYYY-MM-DD')}`)
      .then(res => setBookedSlots(res.data.bookings))
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const canNext = () => {
    if (activeStep === 0) return Boolean(selectedDate);
    if (activeStep === 1) return Boolean(sessionType);
    if (activeStep === 2) return selection && selection.durationHrs >= 1;
    return false;
  };

  const handleNext = () => setActiveStep(s => s + 1);
  const handleBack = () => setActiveStep(s => s - 1);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/bookings', {
        date: selectedDate.format('YYYY-MM-DD'),
        start_time: selection.start_time,
        end_time: selection.end_time,
        session_type: sessionType,
      });
      setSuccess(true);
      setTimeout(() => navigate('/my-bookings'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification');
      setResendStatus({ open: true, message: 'Verification email has been resent successfully.', severity: 'success' });
    } catch (err) {
      setResendStatus({ open: true, message: err.response?.data?.error || 'Failed to resend verification email.', severity: 'error' });
    } finally {
      setResending(false);
    }
  };

  const sessionInfo = SESSION_TYPES.find(s => s.value === sessionType);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="md">
          <Typography variant="h4" fontWeight={700} mb={1}>Book a Session</Typography>
          <Typography color="text.secondary" mb={4}>
            Select your date, session type, and preferred time slots.
          </Typography>

          {user && user.is_verified === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'warning.main', bgcolor: 'rgba(245,127,23,0.05)' }}>
              <CardContent sx={{ py: 3 }}>
                <Typography variant="h5" fontWeight={700} color="warning.light" mb={2}>
                  Verification Required
                </Typography>
                <Typography color="text.secondary" mb={3}>
                  Your account is not verified yet. Please check your email ({' '}<strong>{user.email}</strong>{' '}) for a verification link to unlock the booking system.
                </Typography>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleResendVerification}
                  disabled={resending}
                  sx={{ px: 4, py: 1 }}
                >
                  {resending ? 'Resending...' : 'Resend Verification Email'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {STEPS.map(label => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card>
                    <CardContent sx={{ p: { xs: 2, sm: 4 } }}>

                      {/* Step 0: Date */}
                      {activeStep === 0 && (
                        <Box>
                          <Typography variant="h6" fontWeight={600} mb={3}>When would you like to come in?</Typography>
                          <DatePicker
                            label="Select Date"
                            value={selectedDate}
                            onChange={setSelectedDate}
                            minDate={dayjs()}
                            maxDate={dayjs().add(92, 'day')}
                            slotProps={{
                              textField: { fullWidth: true, size: 'medium' },
                              day: { sx: { '&.Mui-selected': { bgcolor: 'primary.main' } } }
                            }}
                          />
                          {selectedDate && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                              Selected:{' '}<strong>{selectedDate.format('dddd, MMMM D, YYYY')}</strong>
                            </Alert>
                          )}
                        </Box>
                      )}

                      {/* Step 1: Session Type */}
                      {activeStep === 1 && (
                        <Box>
                          <Typography variant="h6" fontWeight={600} mb={3}>What type of session do you need?</Typography>
                          <Stack spacing={2}>
                            {SESSION_TYPES.map(st => (
                              <Paper
                                key={st.value}
                                onClick={() => setSessionType(st.value)}
                                sx={{
                                  p: 3, cursor: 'pointer', border: '2px solid',
                                  borderColor: sessionType === st.value ? `${st.color}.main` : 'divider',
                                  bgcolor: sessionType === st.value ? `rgba(${st.color === 'primary' ? '46,125,50' : '245,127,23'},0.1)` : 'background.paper',
                                  borderRadius: 3, transition: 'all 0.2s',
                                  '&:hover': { borderColor: `${st.color}.light` },
                                }}
                              >
                                <Stack direction="row" alignItems="center" spacing={2}>
                                  <Box sx={{ color: `${st.color}.light` }}>{st.icon}</Box>
                                  <Box flexGrow={1}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                      <Typography variant="h6" fontWeight={600}>{st.label}</Typography>
                                      <Typography variant="h5" fontWeight={800} color={`${st.color}.main`}>
                                        ${st.price}<Typography component="span" variant="caption" color="text.secondary">/hr</Typography>
                                      </Typography>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">{st.desc}</Typography>
                                  </Box>
                                  {sessionType === st.value && (
                                    <CheckCircleIcon color={st.color} />
                                  )}
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Step 2: Slot Grid */}
                      {activeStep === 2 && (
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" spacing={1}>
                            <Typography variant="h6" fontWeight={600}>
                              {selectedDate?.format('ddd, MMM D')} · {sessionInfo?.label}
                            </Typography>
                            <Chip label={`$${sessionInfo?.price}/hr`} color={sessionInfo?.color} variant="outlined" />
                          </Stack>
                          {loadingSlots ? (
                            <Box display="flex" justifyContent="center" py={4}>
                              <CircularProgress />
                            </Box>
                          ) : (
                            <SlotGrid
                              bookedSlots={bookedSlots}
                              selectedDate={selectedDate?.format('YYYY-MM-DD')}
                              sessionType={sessionType}
                              onSelectionChange={setSelection}
                            />
                          )}
                        </Box>
                      )}

                      {/* Step 3: Confirm */}
                      {activeStep === 3 && (
                        <Box>
                          <Typography variant="h6" fontWeight={600} mb={3}>Confirm Your Booking</Typography>
                          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'primary.dark', borderRadius: 3, bgcolor: 'rgba(46,125,50,0.06)' }}>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Date</Typography>
                                <Typography fontWeight={600}>{selectedDate?.format('dddd, MMMM D, YYYY')}</Typography>
                              </Stack>
                              <Divider />
                              <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Session Type</Typography>
                                <Typography fontWeight={600}>{sessionInfo?.label}</Typography>
                              </Stack>
                              <Divider />
                              <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Time</Typography>
                                <Typography fontWeight={600}>
                                  {formatTime(selection?.start_time)} – {formatTime(selection?.end_time)}
                                </Typography>
                              </Stack>
                              <Divider />
                              <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Duration</Typography>
                                <Typography fontWeight={600}>
                                  {selection?.durationHrs === Math.floor(selection?.durationHrs)
                                    ? selection?.durationHrs
                                    : selection?.durationHrs.toFixed(1)} hr{selection?.durationHrs !== 1 ? 's' : ''}
                                </Typography>
                              </Stack>
                              <Divider />
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="h6" fontWeight={700}>Total</Typography>
                                <Typography variant="h5" fontWeight={800} color="secondary.main">
                                  ${selection?.price.toFixed(2)}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Paper>

                          <Alert severity="info" sx={{ mt: 2 }}>
                            Free cancellation up to{' '}<strong>24 hours</strong>{' '}before your session.
                          </Alert>

                          <Button
                            fullWidth variant="contained" color="primary" size="large"
                            onClick={handleConfirm} disabled={submitting}
                            sx={{ mt: 3, py: 1.5, fontSize: '1.05rem' }}
                            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                          >
                            {submitting ? 'Confirming...' : 'Confirm Booking'}
                          </Button>
                        </Box>
                      )}

                      {/* Navigation */}
                      <Stack direction="row" justifyContent="space-between" mt={4}>
                        <Button
                          variant="outlined" onClick={handleBack}
                          disabled={activeStep === 0} startIcon={<ArrowBackIcon />}
                        >
                          Back
                        </Button>
                        {activeStep < STEPS.length - 1 && (
                          <Button
                            variant="contained" color="primary" onClick={handleNext}
                            disabled={!canNext()} endIcon={<ArrowForwardIcon />}
                          >
                            Next
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </Box>
          )}
        </Container>
      </Box>

      <Snackbar open={resendStatus.open} autoHideDuration={4000} onClose={() => setResendStatus(s => ({ ...s, open: false }))}>
        <Alert severity={resendStatus.severity} variant="filled">{resendStatus.message}</Alert>
      </Snackbar>

      <Snackbar open={success} autoHideDuration={3000}>
        <Alert severity="success" variant="filled">
          🎉 Booking confirmed! Redirecting to your bookings...
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
}
