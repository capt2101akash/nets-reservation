# 🏏 Northridge Nets — Cricket Reservation System

A unified, full-stack, production-grade reservation and facility management system for booking cricket net sessions at **Northridge Nets**. 

This application features a multi-step customer booking wizard, a staff **Admin Console** with Role-Based Access Control (RBAC), an automated **Facility Access Code Scheduler** (Meta & Twilio API), and a **Transactions Ledger / Balance Sheet** to audit revenue and payments.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Project Architecture & Features](#project-architecture--features)
- [Role-Based Access Control (RBAC) Matrix](#role-based-access-control-rbac-matrix)
- [Getting Started Locally](#getting-started-locally)
- [Environment Variables (.env)](#environment-variables-env)
- [Database Schema & Persistence](#database-schema--persistence)
- [Fly.io Deployment Guide (Persistent SQLite)](#flyio-deployment-guide-persistent-sqlite)
- [SMS & WhatsApp Integrations](#sms--whatsapp-integrations)
- [SMTP & Mailtrap Email Setup](#smtp--mailtrap-email-setup)
- [Default Admin Credentials](#default-admin-credentials)

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Material UI v9 (MUI), Framer Motion, Axios |
| **Backend** | Node.js (v20+), Express.js (v5) |
| **Database** | SQLite (via `better-sqlite3`) — self-healing migrations |
| **Authentication** | JSON Web Tokens (JWT), bcrypt password hashing |
| **Email Delivery** | Nodemailer (SMTP) & Mailtrap Transactional REST API |
| **SMS/WhatsApp** | Twilio REST API & Meta WhatsApp Cloud API (no third-party deps) |
| **Containerization**| Docker (unified single-port container serving React assets statically) |

---

## Project Architecture & Features

### 1. Customer Portal
* **Verification Block Screen:** Registration sets `is_verified = 0`. Unverified users are blocked from placing bookings at both the frontend and API levels, and can trigger verification link resends.
* **4-Step Booking Wizard:** Guided flow to select dates (MUI DatePicker), choose rates, select time slots (interactive 30-min SlotGrid), and submit.
* **Overlapping Booking Protection:** Interactive calendar shows booked slots in red and blocks double-bookings.
* **My Bookings:** Split into *Upcoming* and *History*. Enforces a 24-hour cancellation window policy for confirmed sessions (unconfirmed or "on hold" bookings bypass this constraint and can be cancelled immediately).

### 2. Admin Console (Tabbed Interface)
* **Bookings Moderation Tab:** View bookings and moderate status. Staff can **Confirm** bookings (logs a payment transaction), **Reject** unpaid ones, or **Cancel** active slots.
* **Users Tab:** Complete list of registered users. Staff with write permissions can update names, emails, phones, verification status, and assign system roles.
* **Balance Sheet Tab:** Audit transactions ledger. Computes gross payments, refunds, and net revenue. Allows manual creation of payments/refunds and ledger record deletion.
* **Utilization Stats:** Real-time analytics showing total revenue, active bookings, cancelled bookings, user count, utilization rates, and revenue breaks by net type.

### 3. Automated Access Code Relay Scheduler
* A background daemon checks the database every 30 seconds for confirmed sessions starting in the next 30 minutes.
* It automatically generates a secure 6-digit access code, updates the booking, and dispatches it via SMS/WhatsApp.

---

## Role-Based Access Control (RBAC) Matrix

We enforce strict authentication boundaries across all administrative routes:

| Feature | Org Admin (`org_admin`/`admin`) | Editor (`editor`) | Viewer (`viewer`) | User (`user`) |
| :--- | :---: | :---: | :---: | :---: |
| **Access Admin Console** | Yes | Yes | Yes | No |
| **View Bookings & Stats** | Yes | Yes | Yes | No |
| **Confirm / Reject Bookings** | Yes | Yes | No | No |
| **Manual Access Code Dispatch** | Yes | Yes | No | No |
| **View Users List** | Yes | Yes | Yes | No |
| **Edit User Details** | Yes | Yes (Non-Admins) | No | No |
| **Alter Roles** | Yes | No | No | No |
| **View Balance Sheet** | Yes | Yes | Yes | No |
| **Record Manual Transaction** | Yes | Yes | No | No |
| **Delete Ledger Transaction** | Yes | No | No | No |
| **Book Slots & View Own History**| Yes | Yes | Yes | Yes |

---

## Getting Started Locally

### 1. Installation
Install dependencies at root, client, and server:
```bash
# Install root tools (concurrently)
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

### 2. Development Mode
Run both Vite dev server (port 5173) and Express backend (port 4000) concurrently:
```bash
npm run dev
```

### 3. Unified Production Mode (Docker-like)
Compile the React build and run Express to serve the compiled bundle statically:
```bash
# Build frontend
cd client && npm run build && cd ..

# Run backend
cd server && npm run start
```
The application will run entirely on **`http://localhost:4000`**.

---

## Environment Variables (.env)
Create a `.env` file in the `server` directory (`server/.env`) to configure connections:

```env
# Server Port (Defaults to 4000)
PORT=4000
JWT_SECRET=your_jwt_secret_key

# SQLite DB Path (Defaults to local server/db/northridge_nets.db)
DB_PATH=/app/data/northridge_nets.db

# Mailtrap REST API
MAILTRAP_API_KEY=your_mailtrap_token
MAILTRAP_SANDBOX_ID=your_sandbox_inbox_id_if_using_sandbox

# SMTP Fallback Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_app_password
SMTP_FROM="Northridge Nets" <your_email@gmail.com>

# Twilio SMS/WhatsApp Settings
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_PHONE=+15555555555
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Meta WhatsApp Cloud API Settings
META_WHATSAPP_TOKEN=your_meta_token
META_PHONE_NUMBER_ID=your_phone_id
```

---

## Database Schema & Persistence

SQLite is file-based, requiring no database server setup.

### Tables:
* **`users`**: Customer credentials, verified status, verification tokens, and role.
* **`bookings`**: Session date, start/end times, session type (`nets_only` / `nets_bowling`), price, status (`confirmed`, `on_hold`, `cancelled`), and facility `access_code`.
* **`transactions`**: Financial audit ledger recording booking IDs, user IDs, amounts (positive for payments, negative for refunds), payment types, methods (`cash`, `card`, `transfer`, `online`), and references.

---

## Fly.io Deployment Guide (Persistent SQLite)

Fly.io is the recommended hosting platform as it supports persistent volumes for SQLite.

### 1. Initialize Application
Install Fly CLI, log in, and launch the deployment configuration:
```bash
brew install flyctl
fly auth login
fly launch
```
*When prompted, select **Yes** to copy the existing `fly.toml` configuration.*

### 2. Provision Storage Volume
Deploying SQLite requires a volume named `northridge_nets_db` to be allocated to the machine:
```bash
fly volumes create northridge_nets_db --size 1
```

### 3. Deploy
Deploy the Docker container to Fly.io:
```bash
fly deploy
```
*The app automatically mounts the volume at `/app/data`, creates the SQLite file, runs the self-healing migration, and is live at `https://your-app-name.fly.dev`.*

---

## SMS & WhatsApp Integrations

Dispatched via `server/utils/notifications.js`:
1. **Meta WhatsApp Cloud API (Primary):** Executes HTTP POST payloads to Facebook Graph API when `META_WHATSAPP_TOKEN` and `META_PHONE_NUMBER_ID` are configured.
2. **Twilio REST API (Fallback):** Executes URL-encoded payloads to Twilio API when `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set.
3. **Simulated Console Output:** If no API keys are found, details are output to the server logs.

---

## SMTP & Mailtrap Email Setup

Verification emails are dispatched using two methods:
* **Mailtrap REST API:** Active when `MAILTRAP_API_KEY` is provided. If `MAILTRAP_SANDBOX_ID` is defined, requests route to the Sandbox inbox; otherwise, they send to the production stream.
* **SMTP Transporter:** Active when `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are provided (e.g. for Gmail SMTP relays).

---

## Default Admin Credentials

Default Admin credentials pre-seeded on startup:
* **Email:** `admin@northridgenets.com`
* **Password:** `Admin@1234`
*(To promote any registered user to Org Admin, update their row in the database, or register them with the target email `akash210197@gmail.com` which is auto-promoted during signup).*
