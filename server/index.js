require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));

// Serve static client assets
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Redirect client-side routing wildcard requests to index.html
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const { startScheduler } = require('./scheduler');

const server = app.listen(PORT, () => {
  console.log(`🏏 Northridge Nets API running on http://localhost:${PORT}`);
  // Start the background scheduler (runs check every 30s)
  if (process.env.NODE_ENV !== 'test') {
    startScheduler();
  }
});

module.exports = server;
