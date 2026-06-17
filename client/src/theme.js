import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f57f17',
      light: '#ffb300',
      dark: '#e65100',
      contrastText: '#000000',
    },
    background: {
      default: '#0d1117',
      paper: '#161b22',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
    },
    success: { main: '#4caf50' },
    error: { main: '#f44336' },
    warning: { main: '#ff9800' },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.95rem',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
          boxShadow: '0 4px 15px rgba(46,125,50,0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1b5e20 0%, #388e3c 100%)',
            boxShadow: '0 6px 20px rgba(46,125,50,0.5)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #f57f17 0%, #ffb300 100%)',
          boxShadow: '0 4px 15px rgba(245,127,23,0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #e65100 0%, #f57f17 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0d1117',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
  },
});

export default theme;
