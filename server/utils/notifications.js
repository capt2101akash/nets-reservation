const nodemailer = require('nodemailer');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_FROM_PHONE || '+15555555555';
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Default Twilio Sandbox number

const metaToken = process.env.META_WHATSAPP_TOKEN;
const metaPhoneNumberId = process.env.META_PHONE_NUMBER_ID;

async function mockSendSMS(phone, message) {
  const normPhone = phone ? phone.toString().trim().toLowerCase() : '';
  
  // Deterministic failure triggers for testing
  if (normPhone.includes('999') || normPhone === 'fail') {
    console.log(`[SMS/WhatsApp API] ❌ Failed to send message to ${phone} (Deterministic trigger).`);
    return false;
  }
  
  // 1. Direct integration with official Meta WhatsApp Cloud API
  if (metaToken && metaPhoneNumberId) {
    try {
      const cleanPhone = phone.replace(/^(whatsapp:|wa:|\+)/i, '').replace(/\D/g, '').trim();
      
      const response = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      const responseData = await response.json();
      if (response.ok) {
        console.log(`[Meta WhatsApp API] ✅ Message sent successfully to ${phone}. Message ID: ${responseData.messages?.[0]?.id}`);
        return true;
      } else {
        console.error(`[Meta WhatsApp API] ❌ Failed to send message to ${phone}:`, responseData.error?.message || responseData);
        return false;
      }
    } catch (err) {
      console.error(`[Meta WhatsApp API] ❌ Error calling Meta API:`, err);
      return false;
    }
  }

  // 2. Integration with Twilio API (Fallback if Twilio keys are present)
  if (accountSid && authToken) {
    try {
      let to = phone.trim();
      let from = fromPhone;

      const isWhatsApp = to.startsWith('whatsapp:') || to.startsWith('wa:') || normPhone.includes('whatsapp');
      if (isWhatsApp) {
        const cleanNumber = to.replace(/^(whatsapp:|wa:)/i, '').trim();
        to = `whatsapp:${cleanNumber}`;
        from = whatsappFrom.startsWith('whatsapp:') ? whatsappFrom : `whatsapp:${whatsappFrom}`;
      } else {
        if (!to.startsWith('+')) {
          to = `+${to}`;
        }
      }

      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', from);
      params.append('Body', message);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const responseData = await response.json();
      if (response.ok) {
        console.log(`[Twilio API] ✅ Message sent successfully to ${to}. SID: ${responseData.sid}`);
        return true;
      } else {
        console.error(`[Twilio API] ❌ Failed to send message to ${to}:`, responseData.message);
        return false;
      }
    } catch (err) {
      console.error(`[Twilio API] ❌ Error calling Twilio API:`, err);
      return false;
    }
  }

  // 3. Fallback to simulated delivery if no API keys are configured
  // 15% simulated random failure rate
  if (Math.random() < 0.15) {
    console.log(`[SMS/WhatsApp API] ❌ Failed to send message to ${phone} (Simulated random failure).`);
    return false;
  }
  
  console.log(`[SMS/WhatsApp API] ✉️ Sent: "${message}" to ${phone}.`);
  return true;
}

async function mockSendVerificationEmail(email, token, origin = 'http://localhost:4000') {
  const verificationLink = `${origin}/api/auth/verify?token=${token}`;
  
  // If Mailtrap API key configuration exists, send using Mailtrap REST API
  if (process.env.MAILTRAP_API_KEY) {
    const fromEmail = process.env.MAILTRAP_FROM_EMAIL || 'mailtrap@demomailtrap.com';
    const fromName = process.env.MAILTRAP_FROM_NAME || 'Northridge Nets';
    const htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2e7d32; text-align: center;">Welcome to Northridge Nets!</h2>
        <p>Hi there,</p>
        <p>Thank you for registering at Northridge Nets. Please verify your email address to unlock your account and begin booking cricket net sessions.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #2e7d32; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2e7d32;"><a href="${verificationLink}">${verificationLink}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">If you did not register for an account, you can safely ignore this email.</p>
      </div>`;

    const payload = {
      from: { email: fromEmail, name: fromName },
      to: [{ email: email }],
      subject: 'Verify your Northridge Nets Account',
      html: htmlContent
    };

    let sent = false;
    const sandboxId = process.env.MAILTRAP_SANDBOX_ID;
    const mailtrapUrl = sandboxId 
      ? `https://sandbox.api.mailtrap.io/api/send/${sandboxId}`
      : 'https://send.api.mailtrap.io/api/send';

    try {
      const response = await fetch(mailtrapUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MAILTRAP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { error: responseText };
      }

      if (response.ok && data.success !== false) {
        console.log(`[Mailtrap API] ✅ Verification email sent successfully to ${email} (${sandboxId ? 'Sandbox Inbox' : 'Live Stream'})`);
        sent = true;
      } else {
        console.error(`[Mailtrap API] ❌ Send failed to ${email}:`, data);
      }
    } catch (err) {
      console.error(`[Mailtrap API] ❌ Error calling Mailtrap endpoint:`, err.message);
    }

    if (sent) return true;
  }

  // If SMTP configuration exists, send a real verification email
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Northridge Nets" <noreply@northridgenets.com>`,
        to: email,
        subject: 'Verify your Northridge Nets Account',
        text: `Welcome to Northridge Nets!\n\nPlease verify your account by clicking the link below:\n${verificationLink}\n\nIf you did not request this, please ignore this email.`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2e7d32; text-align: center;">Welcome to Northridge Nets!</h2>
          <p>Hi there,</p>
          <p>Thank you for registering at Northridge Nets. Please verify your email address to unlock your account and begin booking cricket net sessions.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #2e7d32; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2e7d32;"><a href="${verificationLink}">${verificationLink}</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">If you did not register for an account, you can safely ignore this email.</p>
        </div>`
      });
      console.log(`[SMTP Email] ✅ Verification email sent successfully to ${email}`);
      return true;
    } catch (err) {
      console.error(`[SMTP Email] ❌ Error sending verification email:`, err);
      // Fallback to print the link in console so the workflow doesn't break
    }
  }

  // Fallback to printing verification link in the console logs
  console.log(`
============================================================
📧 SIMULATED EMAIL OUTBOX
To: ${email}
Subject: Verify your Northridge Nets Account
Body:
Welcome to Northridge Nets! Please verify your account by clicking the link below:
${verificationLink}
============================================================
`);
  return true;
}

async function sendNewBookingNotification(booking) {
  const db = require('../db');
  
  // Find all org admins, admins, and editors
  const staff = db.prepare(`
    SELECT name, email, role FROM users 
    WHERE role IN ('org_admin', 'admin', 'editor')
  `).all();
  
  if (staff.length === 0) return;

  const subject = `New Booking Alert: Booking #${booking.id}`;
  const plainText = `A new booking has been created in the system.\n\nBooking ID: #${booking.id}\nCustomer: ${booking.user_name || 'N/A'} (${booking.user_email || 'N/A'})\nDate: ${booking.date}\nTime: ${booking.start_time} - ${booking.end_time}\nSession Type: ${booking.session_type}\nPrice: $${booking.price}\nStatus: ${booking.status}`;
  
  const htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2e7d32; text-align: center;">New Booking Created</h2>
      <p>Hello Staff,</p>
      <p>A new booking has been created. Here are the details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd; width: 35%;">Booking ID</td>
          <td style="padding: 8px; border: 1px solid #ddd;">#${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Customer Name</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${booking.user_name || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Customer Email</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${booking.user_email || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Date</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${booking.date}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Time Slot</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${booking.start_time} - ${booking.end_time}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Session Type</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${booking.session_type === 'nets_only' ? 'Nets Only' : 'Nets with Bowling Machine'}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Price</td>
          <td style="padding: 8px; border: 1px solid #ddd;">$${booking.price}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Status</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #f57c00;">${booking.status.toUpperCase()}</td>
        </tr>
      </table>
      <p style="text-align: center; margin-top: 30px;">
        <a href="https://northridge-nets.fly.dev/admin" style="background-color: #2e7d32; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Open Admin Console</a>
      </p>
    </div>`;

  // 1. Mailtrap REST API
  if (process.env.MAILTRAP_API_KEY) {
    const fromEmail = process.env.MAILTRAP_FROM_EMAIL || 'mailtrap@demomailtrap.com';
    const fromName = process.env.MAILTRAP_FROM_NAME || 'Northridge Nets Alert';
    const payload = {
      from: { email: fromEmail, name: fromName },
      to: staff.map(u => ({ email: u.email })),
      subject: subject,
      html: htmlContent
    };

    const sandboxId = process.env.MAILTRAP_SANDBOX_ID;
    const mailtrapUrl = sandboxId 
      ? `https://sandbox.api.mailtrap.io/api/send/${sandboxId}`
      : 'https://send.api.mailtrap.io/api/send';

    try {
      const response = await fetch(mailtrapUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MAILTRAP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      let data = {};
      try { data = JSON.parse(responseText); } catch (e) { data = { error: responseText }; }

      if (response.ok && data.success !== false) {
        console.log(`[Mailtrap API] ✅ New booking email sent successfully to staff (${sandboxId ? 'Sandbox Inbox' : 'Live Stream'})`);
        return true;
      } else {
        console.error(`[Mailtrap API] ❌ New booking email send failed:`, data);
      }
    } catch (err) {
      console.error(`[Mailtrap API] ❌ Error calling Mailtrap endpoint for new booking:`, err.message);
    }
  }

  // 2. SMTP Transporter
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const toEmails = staff.map(u => u.email).join(', ');
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Northridge Nets Alert" <noreply@northridgenets.com>`,
        to: toEmails,
        subject: subject,
        text: plainText,
        html: htmlContent
      });
      console.log(`[SMTP Email] ✅ New booking email sent successfully to ${toEmails}`);
      return true;
    } catch (err) {
      console.error(`[SMTP Email] ❌ Error sending new booking email:`, err);
    }
  }

  // 3. Fallback to console logs
  const staffList = staff.map(u => `${u.name} (${u.email})`).join(', ');
  console.log(`
============================================================
📧 SIMULATED EMAIL OUTBOX (Staff Alert)
To: ${staffList}
Subject: ${subject}
Body:
${plainText}
============================================================
`);
  return true;
}

module.exports = {
  mockSendSMS,
  mockSendVerificationEmail,
  sendNewBookingNotification
};
