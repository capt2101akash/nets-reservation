import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Stack, Chip, Button,
  Alert, Snackbar, CircularProgress, Grid, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Divider, Tab, Tabs
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CancelIcon from '@mui/icons-material/Cancel';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { motion } from 'framer-motion';
import api from '../api/axios';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function StatCard({ icon, label, value, sub, color = 'primary' }) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center',
            justifyContent: 'center', bgcolor: `${color}.dark`, color: `${color}.light`
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800}>{value}</Typography>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            {sub && <Typography variant="caption" color={`${color}.light`}>{sub}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { user: currentUser } = useAuth();
  const isViewer = currentUser?.role === 'viewer';
  const isEditor = currentUser?.role === 'editor';
  const isFullAdmin = ['admin', 'org_admin'].includes(currentUser?.role);

  const [currentTab, setCurrentTab] = useState(0); // 0 = Bookings, 1 = Users, 2 = Balance Sheet

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '', phone: '', role: '', is_verified: 0 });

  // Balance Sheet state
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [recordTxOpen, setRecordTxOpen] = useState(false);
  const [recordTxForm, setRecordTxForm] = useState({ user_email: '', amount: '', type: 'payment', payment_method: 'online', reference_number: '', booking_id: '' });
  const [deleteTxTarget, setDeleteTxTarget] = useState(null);
  const [deletingTx, setDeletingTx] = useState(false);

  // Passcode state
  const [passcodeEntry, setPasscodeEntry] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [savingPasscode, setSavingPasscode] = useState(false);

  const fetchBookingsAndStats = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDate) params.append('date', filterDate);
    if (filterStatus) params.append('status', filterStatus);

    Promise.all([
      api.get(`/admin/bookings?${params}`),
      api.get('/admin/stats'),
    ]).then(([bookingsRes, statsRes]) => {
      setBookings(bookingsRes.data.bookings);
      setStats(statsRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [filterDate, filterStatus]);

  const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    api.get('/admin/users')
      .then(res => setUsers(res.data.users))
      .catch(console.error)
      .finally(() => setUsersLoading(false));
  }, []);

  const fetchTransactions = useCallback(() => {
    setTransactionsLoading(true);
    api.get('/admin/transactions')
      .then(res => setTransactions(res.data.transactions))
      .catch(console.error)
      .finally(() => setTransactionsLoading(false));
  }, []);

  const fetchPasscode = useCallback(() => {
    setPasscodeLoading(true);
    api.get('/admin/passcode')
      .then(res => {
        if (res.data.passcodeEntry) {
          setPasscodeEntry(res.data.passcodeEntry);
          setPasscode(res.data.passcodeEntry.passcode);
          const dbVal = res.data.passcodeEntry.valid_until;
          if (dbVal) {
            setValidUntil(dbVal.replace(' ', 'T'));
          }
        }
      })
      .catch(console.error)
      .finally(() => setPasscodeLoading(false));
  }, []);

  useEffect(() => {
    if (currentTab === 0) {
      fetchBookingsAndStats();
    } else if (currentTab === 1) {
      fetchUsers();
    } else if (currentTab === 2) {
      fetchTransactions();
    } else if (currentTab === 3) {
      fetchPasscode();
    }
  }, [currentTab, fetchBookingsAndStats, fetchUsers, fetchTransactions, fetchPasscode]);

  const handleAdminCancel = async () => {
    setCancelling(true);
    try {
      await api.delete(`/admin/bookings/${cancelTarget.id}`);
      setSnack({ open: true, message: 'Booking cancelled and transaction refunded.', severity: 'success' });
      fetchBookingsAndStats();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to cancel.', severity: 'error' });
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const handleSavePasscode = async (e) => {
    e.preventDefault();
    if (!passcode.trim() || !validUntil) {
      setSnack({ open: true, message: 'Passcode and validity date/time are required.', severity: 'error' });
      return;
    }
    setSavingPasscode(true);
    try {
      const formattedValidUntil = validUntil.replace('T', ' ');
      const res = await api.post('/admin/passcode', {
        passcode: passcode.trim(),
        valid_until: formattedValidUntil
      });
      setPasscodeEntry(res.data.passcodeEntry);
      setSnack({ open: true, message: 'Facility passcode updated successfully.', severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to update passcode.', severity: 'error' });
    } finally {
      setSavingPasscode(false);
    }
  };

  const handleStatusChange = async (id, action) => {
    setLoading(true);
    try {
      await api.post(`/admin/bookings/${id}/${action}`);
      setSnack({ open: true, message: `Booking ${action === 'confirm' ? 'confirmed' : 'rejected'} successfully.`, severity: 'success' });
      fetchBookingsAndStats();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || `Failed to ${action} booking.`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendManualCode = async (id) => {
    setLoading(true);
    try {
      const res = await api.post(`/admin/bookings/${id}/dispatch`);
      setSnack({ open: true, message: `Access code ${res.data.access_code} dispatched successfully.`, severity: 'success' });
      fetchBookingsAndStats();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to send access code.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUserClick = (row) => {
    const isTargetAdmin = ['admin', 'org_admin'].includes(row.role);
    if (isTargetAdmin && isEditor) {
      setSnack({ open: true, message: 'Forbidden: Editors cannot edit Admin profiles.', severity: 'error' });
      return;
    }
    setEditUserTarget(row);
    setEditUserForm({
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      role: row.role,
      is_verified: row.is_verified
    });
  };

  const handleEditUserSubmit = async () => {
    try {
      await api.put(`/admin/users/${editUserTarget.id}`, editUserForm);
      setSnack({ open: true, message: 'User details updated.', severity: 'success' });
      setEditUserTarget(null);
      fetchUsers();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to update user.', severity: 'error' });
    }
  };

  const handleRecordTxSubmit = async () => {
    try {
      await api.post('/admin/transactions', recordTxForm);
      setSnack({ open: true, message: 'Transaction recorded successfully.', severity: 'success' });
      setRecordTxOpen(false);
      setRecordTxForm({ user_email: '', amount: '', type: 'payment', payment_method: 'online', reference_number: '', booking_id: '' });
      fetchTransactions();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to record transaction.', severity: 'error' });
    }
  };

  const handleDeleteTx = async () => {
    setDeletingTx(true);
    try {
      await api.delete(`/admin/transactions/${deleteTxTarget.id}`);
      setSnack({ open: true, message: 'Transaction entry deleted.', severity: 'success' });
      fetchTransactions();
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to delete transaction.', severity: 'error' });
    } finally {
      setDeletingTx(false);
      setDeleteTxTarget(null);
    }
  };

  const bookingsColumns = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'user_name', headerName: 'Customer', flex: 1, minWidth: 120 },
    { field: 'user_email', headerName: 'Email', flex: 1, minWidth: 150 },
    { field: 'date', headerName: 'Date', width: 110,
      valueFormatter: v => dayjs(v).format('MMM D, YYYY') },
    {
      field: 'time', headerName: 'Time', width: 160,
      valueGetter: (_, row) => `${formatTime(row.start_time)} – ${formatTime(row.end_time)}`,
    },
    {
      field: 'session_type', headerName: 'Type', width: 140,
      renderCell: ({ value }) => (
        <Chip
          size="small"
          label={value === 'nets_bowling' ? 'Nets + Machine' : 'Nets Only'}
          color={value === 'nets_bowling' ? 'secondary' : 'primary'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'price', headerName: 'Price', width: 80,
      valueFormatter: v => `$${v.toFixed(2)}`,
    },
    {
      field: 'status', headerName: 'Status', width: 110,
      renderCell: ({ value }) => (
        <Chip
          size="small"
          label={value === 'confirmed' ? 'Confirmed' : value === 'on_hold' ? 'On Hold' : 'Cancelled'}
          color={value === 'confirmed' ? 'success' : value === 'on_hold' ? 'warning' : 'error'}
        />
      ),
    },
    {
      field: 'access_code', headerName: 'Access Code', width: 110,
      renderCell: ({ value }) => value ? (
        <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="secondary.light">{value}</Typography>
      ) : (
        <Typography variant="caption" color="text.secondary">N/A</Typography>
      )
    },
    {
      field: 'dispatch_status', headerName: 'Code Status', width: 110,
      renderCell: ({ value, row }) => {
        if (row.status !== 'confirmed') return <Typography variant="caption" color="text.secondary">N/A</Typography>;
        if (!value) return <Chip size="small" label="Pending" color="default" variant="outlined" />;
        return (
          <Chip
            size="small"
            label={value === 'success' ? 'Sent' : 'Failed'}
            color={value === 'success' ? 'success' : 'error'}
            variant={value === 'success' ? 'filled' : 'outlined'}
          />
        );
      }
    },
    {
      field: 'actions', headerName: 'Actions', width: 230, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          {row.status === 'on_hold' && (
            <>
              <Button size="small" color="success" variant="contained" disabled={isViewer}
                onClick={() => handleStatusChange(row.id, 'confirm')}>
                Confirm
              </Button>
              <Button size="small" color="error" variant="outlined" disabled={isViewer}
                onClick={() => handleStatusChange(row.id, 'reject')}>
                Reject
              </Button>
            </>
          )}
          {row.status === 'confirmed' && (
            <>
              {row.dispatch_status === 'failed' && (
                <Button size="small" color="info" variant="contained" disabled={isViewer}
                  onClick={() => handleSendManualCode(row.id)}>
                  Send Code
                </Button>
              )}
              <Button size="small" color="error" startIcon={<CancelIcon />} disabled={isViewer}
                onClick={() => setCancelTarget(row)}>
                Cancel
              </Button>
            </>
          )}
        </Stack>
      ),
    },
  ];

  const userColumns = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 120 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    { field: 'phone', headerName: 'Phone', width: 130, valueGetter: (_, row) => row.phone || 'N/A' },
    { field: 'role', headerName: 'Role', width: 130,
      renderCell: ({ value }) => {
        let color = 'default';
        let label = 'User';
        if (value === 'org_admin') { color = 'error'; label = 'Org Admin'; }
        else if (value === 'admin') { color = 'error'; label = 'Admin'; }
        else if (value === 'editor') { color = 'secondary'; label = 'Editor'; }
        else if (value === 'viewer') { color = 'info'; label = 'Viewer'; }
        return <Chip size="small" label={label} color={color} variant="outlined" />;
      }
    },
    { field: 'is_verified', headerName: 'Verified', width: 110,
      renderCell: ({ value }) => (
        <Chip size="small" label={value === 1 ? 'Yes' : 'No'} color={value === 1 ? 'success' : 'default'} />
      )
    },
    { field: 'created_at', headerName: 'Registered', width: 140,
      valueFormatter: v => dayjs(v).format('MMM D, YYYY') },
    { field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <Button size="small" variant="outlined" disabled={isViewer} onClick={() => handleEditUserClick(row)}>
          Edit
        </Button>
      )
    }
  ];

  const transactionColumns = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'created_at', headerName: 'Date', width: 150,
      valueFormatter: v => dayjs(v).format('MMM D, YYYY h:mm A') },
    { field: 'user_name', headerName: 'Customer', flex: 1, minWidth: 120 },
    { field: 'user_email', headerName: 'Email', flex: 1, minWidth: 150 },
    { field: 'booking_id', headerName: 'Booking ID', width: 110,
      renderCell: ({ value }) => value ? (
        <Typography variant="body2" fontWeight={600}>#{value}</Typography>
      ) : (
        <Typography variant="caption" color="text.secondary">Manual</Typography>
      )
    },
    { field: 'amount', headerName: 'Amount', width: 100,
      renderCell: ({ value, row }) => (
        <Typography variant="body2" fontWeight={700} color={row.type === 'payment' ? 'success.main' : 'error.main'}>
          {row.type === 'payment' ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`}
        </Typography>
      )
    },
    { field: 'type', headerName: 'Type', width: 100,
      renderCell: ({ value }) => (
        <Chip size="small" label={value === 'payment' ? 'Payment' : 'Refund'} color={value === 'payment' ? 'success' : 'error'} variant="outlined" />
      )
    },
    { field: 'payment_method', headerName: 'Method', width: 100,
      renderCell: ({ value }) => <Chip size="small" label={value.toUpperCase()} variant="filled" /> },
    { field: 'reference_number', headerName: 'Reference', flex: 1, minWidth: 120, valueGetter: (_, row) => row.reference_number || 'N/A' },
    { field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <Button size="small" color="error" variant="outlined" disabled={!isFullAdmin} onClick={() => setDeleteTxTarget(row)}>
          Delete
        </Button>
      )
    }
  ];

  const totalRev = stats?.totalRevenue || 0;

  // Calculate transaction list metrics
  const grossPayments = transactions.filter(t => t.type === 'payment').reduce((a, b) => a + b.amount, 0);
  const grossRefunds = transactions.filter(t => t.type === 'refund').reduce((a, b) => a + Math.abs(b.amount), 0);
  const netRevenue = grossPayments - grossRefunds;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AdminPanelSettingsIcon sx={{ fontSize: 36, color: 'secondary.light' }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>Admin Console</Typography>
              <Typography color="text.secondary">Roles: Org Admin, Editor, Viewer</Typography>
            </Box>
          </Stack>
          
          <Tabs value={currentTab} onChange={(_, nv) => setCurrentTab(nv)} textColor="secondary" indicatorColor="secondary">
            <Tab label="Bookings" icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Users" icon={<PeopleIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Balance Sheet" icon={<AttachMoneyIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Facility Passcode" icon={<VpnKeyIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Stack>

        {/* Viewer Mode Alert */}
        {isViewer && (
          <Alert severity="info" variant="filled" sx={{ mb: 3 }}>
            <strong>Viewing Mode:</strong> You have read-only permissions. Action buttons are disabled.
          </Alert>
        )}

        {/* Tab 0: Bookings Dashboard */}
        {currentTab === 0 && (
          <>
            {/* Stats */}
            {stats && (
              <Grid container spacing={2} mb={4}>
                {[
                  { icon: <AttachMoneyIcon />, label: 'Total Revenue', value: `$${totalRev.toFixed(0)}`, color: 'secondary' },
                  { icon: <CalendarMonthIcon />, label: 'Total Bookings', value: stats.totalBookings, color: 'primary' },
                  { icon: <TrendingUpIcon />, label: 'Upcoming Sessions', value: stats.upcomingBookings, color: 'success' },
                  { icon: <PeopleIcon />, label: 'Registered Users', value: stats.totalUsers, color: 'primary' },
                ].map((s, i) => (
                  <Grid item xs={6} md={3} key={s.label}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                      <StatCard {...s} />
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Revenue by type */}
            {stats?.revenueByType?.length > 0 && (
              <Grid container spacing={2} mb={4}>
                {stats.revenueByType.map(rt => (
                  <Grid item xs={12} sm={6} key={rt.session_type}>
                    <Card>
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              {rt.session_type === 'nets_bowling' ? 'Nets + Bowling Machine' : 'Nets Only'}
                            </Typography>
                            <Typography variant="h5" fontWeight={700}>${rt.revenue.toFixed(2)}</Typography>
                          </Box>
                          <Chip
                            label={`${rt.count} session${rt.count !== 1 ? 's' : ''}`}
                            color={rt.session_type === 'nets_bowling' ? 'secondary' : 'primary'}
                            variant="outlined"
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Filters */}
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <TextField
                    label="Filter by Date" type="date"
                    value={filterDate} onChange={e => setFilterDate(e.target.value)}
                    InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 180 }}
                  />
                  <TextField
                    label="Filter by Status" select
                    value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    size="small" sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="on_hold">On Hold</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </TextField>
                  <Button variant="outlined" onClick={() => { setFilterDate(''); setFilterStatus(''); }}>
                    Clear
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* Bookings Grid */}
            <Card>
              <Box sx={{ height: 550 }}>
                <DataGrid
                  rows={bookings}
                  columns={bookingsColumns}
                  loading={loading}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
                    '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(46,125,50,0.05)' },
                  }}
                />
              </Box>
            </Card>
          </>
        )}

        {/* Tab 1: Users Management */}
        {currentTab === 1 && (
          <Card>
            <Box sx={{ height: 600 }}>
              <DataGrid
                rows={users}
                columns={userColumns}
                loading={usersLoading}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
                  '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(46,125,50,0.05)' },
                }}
              />
            </Box>
          </Card>
        )}

        {/* Tab 2: Balance Sheet */}
        {currentTab === 2 && (
          <>
            {/* Financial Stats Summary */}
            <Grid container spacing={2} mb={4}>
              <Grid item xs={12} md={4}>
                <StatCard icon={<AttachMoneyIcon />} label="Gross Payments" value={`+$${grossPayments.toFixed(2)}`} color="success" />
              </Grid>
              <Grid item xs={12} md={4}>
                <StatCard icon={<AttachMoneyIcon />} label="Total Refunds" value={`-$${grossRefunds.toFixed(2)}`} color="error" />
              </Grid>
              <Grid item xs={12} md={4}>
                <StatCard icon={<AttachMoneyIcon />} label="Net Revenue" value={`$${netRevenue.toFixed(2)}`} color="secondary" />
              </Grid>
            </Grid>

            {/* Action Bar */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>Audit Transactions Ledger</Typography>
              <Button variant="contained" color="secondary" startIcon={<AttachMoneyIcon />} disabled={isViewer} onClick={() => setRecordTxOpen(true)}>
                Record Transaction
              </Button>
            </Stack>

            {/* Transactions Grid */}
            <Card>
              <Box sx={{ height: 550 }}>
                <DataGrid
                  rows={transactions}
                  columns={transactionColumns}
                  loading={transactionsLoading}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
                    '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(46,125,50,0.05)' },
                  }}
                />
              </Box>
            </Card>
          </>
        )}

        {/* Tab 3: Facility Passcode Settings */}
        {currentTab === 3 && (
          <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={3}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                      <Box sx={{
                        width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', bgcolor: 'secondary.dark', color: 'secondary.light'
                      }}>
                        <VpnKeyIcon />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={700}>Facility Passcode</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Configure the global gate access passcode.
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider />

                    {passcodeLoading ? (
                      <Stack alignItems="center" py={4}>
                        <CircularProgress color="secondary" />
                      </Stack>
                    ) : (
                      <>
                        <Box sx={{
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          p: 3,
                          textAlign: 'center'
                        }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                            Current Active Passcode
                          </Typography>
                          <Typography variant="h3" fontWeight={800} color="secondary.light" sx={{ my: 1.5, letterSpacing: 2 }}>
                            {passcodeEntry ? passcodeEntry.passcode : 'None'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Valid Until: <strong>{passcodeEntry ? dayjs(passcodeEntry.valid_until).format('MMM D, YYYY h:mm A') : 'N/A'}</strong>
                          </Typography>
                        </Box>

                        <form onSubmit={handleSavePasscode}>
                          <Stack spacing={2.5}>
                            <TextField
                              fullWidth
                              label="Gate Passcode"
                              variant="outlined"
                              value={passcode}
                              onChange={(e) => setPasscode(e.target.value)}
                              disabled={isViewer || savingPasscode}
                              placeholder="e.g. 55555"
                              helperText="The passcode clients will receive in their booking confirmation emails."
                              required
                            />

                            <TextField
                              fullWidth
                              label="Validity Expiration"
                              type="datetime-local"
                              variant="outlined"
                              value={validUntil}
                              onChange={(e) => setValidUntil(e.target.value)}
                              disabled={isViewer || savingPasscode}
                              InputLabelProps={{ shrink: true }}
                              helperText="When this passcode expires (clients will get a warning if expired)."
                              required
                            />

                            {!isViewer && (
                              <Button
                                type="submit"
                                variant="contained"
                                color="secondary"
                                size="large"
                                disabled={savingPasscode}
                                sx={{ py: 1.5 }}
                              >
                                {savingPasscode ? <CircularProgress size={24} color="inherit" /> : 'Update Passcode'}
                              </Button>
                            )}
                          </Stack>
                        </form>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Box>
        )}
      </Container>

      {/* Booking Cancel Dialog */}
      <Dialog open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)}>
        <DialogTitle>Cancel Booking (Admin)</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cancel booking #{cancelTarget?.id} for{' '}<strong>{cancelTarget?.user_name}</strong>{' '}on{' '}
            <strong>{cancelTarget && dayjs(cancelTarget.date).format('MMM D, YYYY')}</strong>{' '}at{' '}
            <strong>{cancelTarget && formatTime(cancelTarget.start_time)}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Keep</Button>
          <Button color="error" variant="contained" onClick={handleAdminCancel} disabled={cancelling}>
            {cancelling ? <CircularProgress size={20} color="inherit" /> : 'Cancel Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Edit Dialog */}
      <Dialog open={Boolean(editUserTarget)} onClose={() => setEditUserTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Modify User Profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Full Name"
              fullWidth
              value={editUserForm.name}
              onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="Email Address"
              fullWidth
              value={editUserForm.email}
              onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))}
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={editUserForm.phone}
              onChange={e => setEditUserForm(f => ({ ...f, phone: e.target.value }))}
            />
            <TextField
              select
              fullWidth
              label="Role"
              value={editUserForm.role}
              onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
              {isFullAdmin && <MenuItem value="editor">Editor</MenuItem>}
              {isFullAdmin && <MenuItem value="org_admin">Org Admin</MenuItem>}
            </TextField>
            <TextField
              select
              fullWidth
              label="Verified User"
              value={editUserForm.is_verified}
              onChange={e => setEditUserForm(f => ({ ...f, is_verified: Number(e.target.value) }))}
            >
              <MenuItem value={1}>Verified</MenuItem>
              <MenuItem value={0}>Unverified</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserTarget(null)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleEditUserSubmit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Transaction Dialog */}
      <Dialog open={recordTxOpen} onClose={() => setRecordTxOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record Manual Transaction</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Customer Registered Email"
              fullWidth
              value={recordTxForm.user_email}
              onChange={e => setRecordTxForm(f => ({ ...f, user_email: e.target.value }))}
              placeholder="e.g. customer@example.com"
            />
            <TextField
              label="Amount ($)"
              type="number"
              fullWidth
              value={recordTxForm.amount}
              onChange={e => setRecordTxForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 50.00"
            />
            <TextField
              select
              fullWidth
              label="Transaction Type"
              value={recordTxForm.type}
              onChange={e => setRecordTxForm(f => ({ ...f, type: e.target.value }))}
            >
              <MenuItem value="payment">Payment</MenuItem>
              <MenuItem value="refund">Refund</MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              label="Payment Method"
              value={recordTxForm.payment_method}
              onChange={e => setRecordTxForm(f => ({ ...f, payment_method: e.target.value }))}
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="card">Card</MenuItem>
              <MenuItem value="transfer">Bank Transfer</MenuItem>
              <MenuItem value="online">Online Payment</MenuItem>
            </TextField>
            <TextField
              label="Reference / Invoice #"
              fullWidth
              value={recordTxForm.reference_number}
              onChange={e => setRecordTxForm(f => ({ ...f, reference_number: e.target.value }))}
              placeholder="e.g. TXN-12345"
            />
            <TextField
              label="Booking ID (Optional)"
              type="number"
              fullWidth
              value={recordTxForm.booking_id}
              onChange={e => setRecordTxForm(f => ({ ...f, booking_id: e.target.value }))}
              placeholder="e.g. 12"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordTxOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleRecordTxSubmit}>
            Record Entry
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Transaction Dialog */}
      <Dialog open={Boolean(deleteTxTarget)} onClose={() => setDeleteTxTarget(null)}>
        <DialogTitle>Revert Transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete transaction entry #{deleteTxTarget?.id} (amount: ${deleteTxTarget && Math.abs(deleteTxTarget.amount).toFixed(2)}) for{' '}<strong>{deleteTxTarget?.user_email}</strong>? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTxTarget(null)}>Keep Entry</Button>
          <Button color="error" variant="contained" onClick={handleDeleteTx} disabled={deletingTx}>
            {deletingTx ? <CircularProgress size={20} color="inherit" /> : 'Delete Record'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
