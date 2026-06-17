import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, Tooltip, Paper, Button, Stack, Divider } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import ScheduleIcon from '@mui/icons-material/Schedule';

// Generate all 30-min slots from 08:30 to 22:00 (last slot ends 22:30)
function generateSlots() {
  const slots = [];
  let hour = 8, minute = 30;
  while (hour < 22 || (hour === 22 && minute === 0)) {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    const endMinute = minute + 30;
    const endH = String(endMinute === 60 ? hour + 1 : hour).padStart(2, '0');
    const endM = String(endMinute === 60 ? 0 : endMinute).padStart(2, '0');
    slots.push({
      start: `${h}:${m}`,
      end: `${endH}:${endM}`,
      label: formatTime(`${h}:${m}`),
    });
    if (minute === 30) { minute = 0; hour++; }
    else { minute = 30; }
  }
  return slots;
}

function formatTime(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const ALL_SLOTS = generateSlots();

const RATES = { nets_only: 30, nets_bowling: 50 };

export default function SlotGrid({ bookedSlots = [], selectedDate, sessionType, onSelectionChange }) {
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [selectedDate, sessionType]);

  const isBooked = useCallback((slot) => {
    return bookedSlots.some(b => {
      const bStart = toMinutes(b.start_time);
      const bEnd = toMinutes(b.end_time);
      const sStart = toMinutes(slot.start);
      const sEnd = toMinutes(slot.end);
      return bStart < sEnd && bEnd > sStart;
    });
  }, [bookedSlots]);

  const isPast = useCallback((slot, date) => {
    if (!date) return false;
    const now = new Date();
    const slotDateTime = new Date(`${date}T${slot.start}:00`);
    return slotDateTime <= now;
  }, []);

  const getSlotIndex = (slot) => ALL_SLOTS.findIndex(s => s.start === slot.start);

  const getSelectionRange = () => {
    if (selectionStart === null) return [];
    const end = selectionEnd !== null ? selectionEnd : selectionStart;
    const lo = Math.min(selectionStart, end);
    const hi = Math.max(selectionStart, end);
    return [lo, hi];
  };

  const isInSelection = (index) => {
    const [lo, hi] = getSelectionRange();
    return index >= lo && index <= hi;
  };

  const isInHover = (index) => {
    if (selectionStart === null || selectionEnd !== null || hoveredIndex === null) return false;
    const lo = Math.min(selectionStart, hoveredIndex);
    const hi = Math.max(selectionStart, hoveredIndex);
    return index >= lo && index <= hi;
  };

  const handleSlotClick = (index) => {
    const slot = ALL_SLOTS[index];
    if (isBooked(slot) || isPast(slot, selectedDate)) return;

    if (selectionStart === null || selectionEnd !== null) {
      // Start new selection
      setSelectionStart(index);
      setSelectionEnd(null);
      onSelectionChange(null);
    } else {
      // Complete selection
      const lo = Math.min(selectionStart, index);
      const hi = Math.max(selectionStart, index);

      // Check if any slot in range is booked or past
      const blocked = ALL_SLOTS.slice(lo, hi + 1).some(s => isBooked(s) || isPast(s, selectedDate));
      if (blocked) {
        setSelectionStart(index);
        setSelectionEnd(null);
        onSelectionChange(null);
        return;
      }

      setSelectionEnd(index);
      const startTime = ALL_SLOTS[lo].start;
      const endTime = ALL_SLOTS[hi].end;
      const durationMins = toMinutes(endTime) - toMinutes(startTime);
      const durationHrs = durationMins / 60;

      if (durationHrs < 1) {
        onSelectionChange(null);
      } else {
        const price = durationHrs * (RATES[sessionType] || 0);
        onSelectionChange({ start_time: startTime, end_time: endTime, durationHrs, price });
      }
    }
  };

  const handleReset = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    onSelectionChange(null);
  };

  const [lo, hi] = getSelectionRange();
  const selectedStart = selectionStart !== null && selectionEnd !== null ? ALL_SLOTS[lo].start : null;
  const selectedEnd = selectionStart !== null && selectionEnd !== null ? ALL_SLOTS[hi].end : null;
  const durationMins = selectedStart && selectedEnd ? toMinutes(selectedEnd) - toMinutes(selectedStart) : 0;
  const durationHrs = durationMins / 60;

  return (
    <Box>
      {/* Legend */}
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={2}>
        {[
          { color: '#2e7d32', label: 'Available', icon: null },
          { color: '#c62828', label: 'Booked', icon: null },
          { color: '#f57f17', label: 'Your selection', icon: null },
          { color: '#37474f', label: 'Past / Unavailable', icon: null },
        ].map(item => (
          <Stack key={item.label} direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: item.color }} />
            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
          </Stack>
        ))}
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        Click a slot to start selection, click again to end. Minimum 1 hour (2 slots).
      </Typography>

      {/* Slot Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1 }}>
        {ALL_SLOTS.map((slot, index) => {
          const booked = isBooked(slot);
          const past = isPast(slot, selectedDate);
          const inSel = isInSelection(index);
          const inHov = isInHover(index);
          const disabled = booked || past;

          let bgcolor = 'rgba(46,125,50,0.12)';
          let border = '1px solid rgba(46,125,50,0.3)';
          let color = '#4caf50';

          if (disabled) {
            bgcolor = 'rgba(55,71,79,0.3)';
            border = '1px solid rgba(55,71,79,0.4)';
            color = '#546e7a';
          }
          if (booked) {
            bgcolor = 'rgba(198,40,40,0.15)';
            border = '1px solid rgba(198,40,40,0.4)';
            color = '#ef5350';
          }
          if (inHov && !disabled) {
            bgcolor = 'rgba(245,127,23,0.1)';
            border = '1px solid rgba(245,127,23,0.5)';
            color = '#ffa726';
          }
          if (inSel && !disabled) {
            bgcolor = 'rgba(245,127,23,0.25)';
            border = '2px solid #f57f17';
            color = '#ffb300';
          }

          return (
            <Tooltip
              key={slot.start}
              title={booked ? 'Already booked' : past ? 'Past time' : `${slot.label} – ${formatTime(slot.end)}`}
              arrow
            >
              <Box
                onClick={() => handleSlotClick(index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                sx={{
                  bgcolor,
                  border,
                  borderRadius: 2,
                  p: '10px 8px',
                  textAlign: 'center',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  '&:hover': !disabled ? {
                    transform: 'scale(1.03)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  } : {},
                }}
              >
                <Typography variant="caption" fontWeight={600} color={color} display="block">
                  {slot.label}
                </Typography>
                <Typography variant="caption" color={color} sx={{ opacity: 0.75, fontSize: '0.65rem' }}>
                  {formatTime(slot.end)}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Selection summary */}
      {selectionStart !== null && (
        <Paper sx={{ mt: 2, p: 2, bgcolor: 'rgba(245,127,23,0.08)', border: '1px solid rgba(245,127,23,0.3)' }}>
          {selectionEnd === null ? (
            <Typography variant="body2" color="secondary.light">
              <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Starting at {formatTime(ALL_SLOTS[selectionStart].start)} — now click an ending slot
            </Typography>
          ) : durationHrs < 1 ? (
            <Typography variant="body2" color="error.light">
              ⚠️ Minimum booking is 1 hour. Please select at least 2 slots.
            </Typography>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
              <Box>
                <Typography variant="body2" color="secondary.light" fontWeight={600}>
                  <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  {formatTime(selectedStart)} → {formatTime(selectedEnd)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Duration: {durationHrs === Math.floor(durationHrs) ? durationHrs : durationHrs.toFixed(1)} hr
                  {durationHrs !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={`$${(durationHrs * (RATES[sessionType] || 0)).toFixed(2)}`}
                  color="secondary"
                  icon={<CheckCircleIcon />}
                  sx={{ fontWeight: 700, fontSize: '1rem' }}
                />
                <Button size="small" variant="outlined" color="warning" onClick={handleReset}>
                  Reset
                </Button>
              </Stack>
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}
