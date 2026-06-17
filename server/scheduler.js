const db = require('./db');
const { mockSendSMS } = require('./utils/notifications');

function checkAndDispatchCodes() {
  try {
    const now = new Date();
    // Fetch bookings that are confirmed and haven't had their code sent yet
    const bookings = db.prepare(`
      SELECT b.*, u.phone, u.name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.status = 'confirmed' AND b.code_sent = 0
    `).all();

    bookings.forEach(b => {
      const sessionDateTime = new Date(`${b.date}T${b.start_time}:00`);
      const diffMs = sessionDateTime - now;
      const diffMins = Math.floor(diffMs / (1000 * 60));

      // Check if session starts within the next 30 minutes and is in the future
      if (diffMins >= 0 && diffMins <= 30) {
        console.log(`[Scheduler] ⏱️ Booking #${b.id} for ${b.name} starts in ${diffMins} mins. Dispatching access code...`);
        
        // Generate secure 6-digit access code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const message = `Hi ${b.name}, your access code for Northridge Nets on ${b.date} at ${b.start_time} is ${code}.`;
        
        const success = mockSendSMS(b.phone, message);
        if (success) {
          db.prepare(`
            UPDATE bookings
            SET dispatch_status = 'success', code_sent = 1, access_code = ?
            WHERE id = ?
          `).run(code, b.id);
          console.log(`[Scheduler] ✅ Successfully sent access code for booking #${b.id}.`);
        } else {
          db.prepare(`
            UPDATE bookings
            SET dispatch_status = 'failed'
            WHERE id = ?
          `).run(b.id);
          console.log(`[Scheduler] ❌ Failed to dispatch access code for booking #${b.id}.`);
        }
      }
    });
  } catch (error) {
    console.error(`[Scheduler] Error checking and dispatching codes:`, error);
  }
}

let intervalId = null;

function startScheduler(intervalMs = 30000) {
  console.log(`[Scheduler] 🚀 Starting background access code relay scheduler (running every ${intervalMs / 1000}s)...`);
  checkAndDispatchCodes(); // run once immediately
  intervalId = setInterval(checkAndDispatchCodes, intervalMs);
}

function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('[Scheduler] 🛑 Background scheduler stopped.');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  checkAndDispatchCodes
};
