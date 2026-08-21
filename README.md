# 🏥 Healthcare Appointment & Follow-up Manager

> A full-stack clinic platform where patients book appointments, doctors get AI-powered triage summaries, and everyone stays in sync through email notifications and real-time updates.

Built with Node.js, React, PostgreSQL, and Google Gemini — all running on free-tier infrastructure.

---

## 🌐 Live Links

| | Link |
|---|---|
| **Frontend (Vercel)** | [https://healthcare-appointment-manager-eight.vercel.app](https://healthcare-appointment-manager-eight.vercel.app) |
| **Backend API (Render)** | [https://healthcare-appointment-manager-67ss.onrender.com](https://healthcare-appointment-manager-67ss.onrender.com) |
| **Health check** | [https://healthcare-appointment-manager-67ss.onrender.com/health](https://healthcare-appointment-manager-67ss.onrender.com/health) |
| **GitHub repo** | [https://github.com/anwesa-techlearner/Healthcare_Appointment_Manager](https://github.com/anwesa-techlearner/Healthcare_Appointment_Manager) |

---

## 🔑 Try it right now

The database is pre-seeded with demo accounts. Just go to the live frontend and sign in:

| Role | Email | Password |
|---|---|---|
| 🔴 Admin | admin@clinic.com | Demo@1234 |
| 🩺 Doctor (Cardiology) | dr.sarah.chen@clinic.com | Demo@1234 |
| 🩺 Doctor (General Practice) | dr.james.okafor@clinic.com | Demo@1234 |
| 🩺 Doctor (Neurology) | dr.priya.sharma@clinic.com | Demo@1234 |
| 🧑 Patient | alice.johnson@email.com | Demo@1234 |
| 🧑 Patient | bob.smith@email.com | Demo@1234 |

Or [register a new patient account](https://healthcare-appointment-manager-eight.vercel.app/register) — takes under a minute.

---

## 💡 What it does

Three separate portals — Patient, Doctor, and Admin — each with their own view of the world:

**For patients:**
- Search doctors by name or specialization, pick an available slot, and book it
- Describe symptoms before the visit — the AI generates a triage summary for your doctor
- After the visit, receive a plain-language summary of what was discussed and your medication schedule
- View your full health timeline — every past visit, prescription, and summary in one place

**For doctors:**
- See the day's appointments with urgency badges (Low / Medium / High) at a glance
- Read the AI pre-visit triage before the patient walks in — chief complaint and suggested questions ready
- Submit visit notes and a prescription; the system turns clinical language into a patient-friendly summary automatically
- Manage working hours and block leave days; affected appointments are cancelled and patients notified automatically

**For admins:**
- Create doctor accounts and manage the clinic roster
- View all appointments across the platform
- Monitor failed email/calendar notifications and retry them
- Browse the full audit log of admin actions

---

## 🛠 Tech stack

| Layer | What we use | Why |
|---|---|---|
| Backend | Node.js + TypeScript + Express | Lightweight, well-documented, easy to deploy |
| Database | PostgreSQL via Prisma ORM | Transactions + unique constraints for conflict-free booking |
| Frontend | React + Vite + TypeScript + Tailwind CSS | Fast builds, no extra UI library needed |
| Auth | JWT (access + refresh tokens) + bcrypt | No third-party auth service dependency |
| Background jobs | BullMQ + Redis (node-cron fallback) | Slot expiry, medication reminders, notification retries |
| Email | Nodemailer + SendGrid | Free tier SMTP |
| Calendar | Google Calendar API v3 + OAuth 2.0 | As per spec |
| AI / LLM | Any OpenAI-compatible API (Gemini by default) | Provider-agnostic — swap with one env var |
| Hosting | Render (backend) + Vercel (frontend) + Neon (DB) + Upstash (Redis) | Entirely free tier |

---

## 🚀 Run it locally

### What you need first
- Node.js 20+
- A PostgreSQL database — [Neon](https://neon.tech) free tier works great
- Redis — [Upstash](https://upstash.com) free tier, or set `USE_CRON_FALLBACK=true` to skip Redis entirely

### Backend

```bash
cd backend
cp .env.example .env
# Open .env and fill in DATABASE_URL, JWT secrets at minimum
npm ci
npx prisma migrate deploy --schema=src/prisma/schema.prisma
npx prisma generate --schema=src/prisma/schema.prisma
npm run seed      # creates all demo accounts
npm run dev       # starts on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000
npm ci
npm run dev       # starts on http://localhost:5173
```

---

## ⚙️ Environment variables

### Backend — `backend/.env`

```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_ACCESS_SECRET=at_least_32_random_chars
JWT_REFRESH_SECRET=different_32_random_chars

# CORS — comma-separated list of allowed frontend origins
FRONTEND_URL=http://localhost:5173

# Redis (or set USE_CRON_FALLBACK=true to skip)
REDIS_URL=redis://localhost:6379
USE_CRON_FALLBACK=false

# AI (Gemini recommended — free tier)
LLM_API_KEY=AIza...
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-2.5-flash
LLM_TIMEOUT_MS=15000

# Email (SendGrid SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
EMAIL_FROM=noreply@yourclinic.com

# Google Calendar OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/calendar/oauth/callback
```

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:4000
```

---

## 🤖 AI setup (Google Gemini)

The LLM integration works with any OpenAI-compatible API. Gemini is the default because it has a genuine free tier.

1. Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Set these three env vars:

```
LLM_API_KEY=AIza...your_key
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-2.5-flash
```

That's it. The trailing slash on `LLM_BASE_URL` is required — the SDK appends `chat/completions` directly.

**Other providers that work without code changes:**

| Provider | Base URL | Model |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Groq (free tier) | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |
| Gemini (budget) | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-2.5-flash-lite` |

If `LLM_API_KEY` is empty, the app keeps working — urgency shows as `Unknown` and raw notes are stored instead of a generated summary. The AI is enhancement-only, never a dependency.

---

## 🗄 Database schema

The full Prisma schema lives at [`backend/src/prisma/schema.prisma`](backend/src/prisma/schema.prisma). Key entities:

```
User                — patients, doctors, admins; includes dateOfBirth and gender
DoctorProfile       — specialization, bio, slot duration, timezone
DoctorAvailability  — working hours per day of week
DoctorLeave         — blocked days; adding one auto-cancels confirmed appointments
Appointment         — hold → confirm → complete lifecycle, unique constraint prevents double-booking
Symptom             — pre-visit text + AI triage JSON (urgency, chief complaint, questions)
VisitNote           — post-visit notes + AI patient-friendly summary + prescription JSON
MedicationReminder  — parsed from prescription, drives email reminder schedule
NotificationLog     — every email/calendar attempt, with retry state and error log
CalendarEvent       — Google Calendar event tracking (create/update/delete)
AuditLog            — full admin action history
NoShowFollowUp      — no-show detection and automatic rebooking email
```

**How double-booking is prevented:** When a patient holds a slot, the backend runs an `INSERT` inside a transaction against a table with a `UNIQUE(doctor_id, slot_start)` constraint. If two requests race for the same slot, one gets a `P2002` unique violation and is rejected with a clear error — no application-level check-then-insert. Details in [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md).

---

## 📡 API reference

### Auth — no token needed

```
POST /api/auth/register     Create a patient account
POST /api/auth/login        Sign in (returns access + refresh tokens)
POST /api/auth/refresh      Swap a refresh token for a new access token
POST /api/auth/logout       Revoke refresh token
GET  /api/auth/me           Current user profile
```

### Doctors

```
GET    /api/doctors                              Search by name or specialization
GET    /api/doctors/:id                          Doctor profile + availability
GET    /api/doctors/:id/slots?date=YYYY-MM-DD    Available booking slots for a date
PUT    /api/doctors/:id/availability             Set working hours (doctor/admin)
POST   /api/doctors/:id/leaves                   Add leave day — cascades cancellations
DELETE /api/doctors/:id/leaves/:leaveId          Remove leave day
```

### Appointments

```
POST /api/appointments/hold              Hold a slot for 5 minutes
POST /api/appointments/:id/confirm       Confirm the hold → booking
POST /api/appointments/:id/cancel        Cancel (patient/doctor/admin)
POST /api/appointments/:id/reschedule    Move to a new slot
POST /api/appointments/:id/complete      Mark as completed (doctor/admin)
GET  /api/appointments/patient/my        Patient's own appointments
GET  /api/appointments                   All appointments (admin only)
```

### Symptoms & visit notes

```
POST /api/appointments/:id/symptoms    Submit symptoms → triggers AI triage
GET  /api/appointments/:id/symptoms    View triage summary (doctor/admin only)
POST /api/appointments/:id/notes       Submit visit notes → triggers AI summary
GET  /api/appointments/:id/notes       View visit note (patient sees own)
```

### System

```
GET /health                        DB, Redis, email, calendar status
GET /api/notifications/failed      Failed notification log (admin)
GET /api/admin/audit-logs          Admin action history (admin)
GET /api/users/:id/timeline        Patient health timeline
```

---

## 📅 Google Calendar setup

1. Open [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web Application type)
3. Add your backend URL as an authorized redirect: `https://your-api.onrender.com/api/calendar/oauth/callback`
4. Copy the client ID and secret into your environment variables
5. Users connect their calendar from within the app via `GET /api/calendar/oauth/connect`

---

## 📦 Deployment

Full step-by-step free-tier instructions are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Short version:
- **Database:** [Neon](https://neon.tech) (free PostgreSQL)
- **Redis:** [Upstash](https://upstash.com) (free serverless Redis)
- **Backend:** [Render](https://render.com) — connects to this repo, uses `render.yaml`
- **Frontend:** [Vercel](https://vercel.com) — auto-deploys from `frontend/` on every push

---

## 🏗 Project structure

```
/backend
  /src
    /config          — env, logger, Prisma client, Redis client
    /middleware      — JWT auth, RBAC, rate limiting, error handler
    /modules
      /auth          — register, login, token refresh
      /users         — admin: create doctors, patient timelines
      /doctors       — search, availability, leave management
      /appointments  — hold/confirm/cancel/reschedule flow
      /symptoms      — pre-visit AI triage
      /visit-notes   — post-visit AI summaries
      /notifications — email templates, retry logic
      /calendar      — Google Calendar OAuth + event management
      /jobs          — slot expiry, medication reminders, no-show detection
    /prisma          — schema.prisma, migrations/, seed.ts
    /utils           — JWT helpers, LLM client, medication parser
  /frontend
  /src
    /pages
      /patient       — dashboard, book appointment, appointments list, health timeline
      /doctor        — dashboard, appointment detail, availability, leaves
      /admin         — dashboard, create doctor, audit log, failed notifications
    /components      — Layout, ProtectedRoute, UrgencyBadge
    /context         — AuthContext (login, logout, register)
    /api             — Axios client + all endpoint wrappers
/docs
  SYSTEM_DESIGN.md   — double-booking, slot hold, CORS, notification retry
  DEPLOYMENT.md      — step-by-step free-tier hosting guide
```

---

## ✅ What's built

**Core requirements:**
- Conflict-free slot booking with 5-minute hold window and DB-level uniqueness constraint
- Doctor leave days atomically cancel all confirmed appointments and notify patients
- Pre-visit AI triage — urgency level, chief complaint, three suggested questions
- Post-visit AI patient summary — plain language, medication schedule, follow-up steps
- Email notifications with exponential backoff retry (1m → 5m → 15m, max 3 attempts)
- Google Calendar event creation and deletion
- Background jobs for slot expiry, medication reminders, notification retries
- JWT auth with refresh token rotation and revocation
- Role-based access control enforced at the API layer, not just the UI

**Bonus features:**
- Real-time slot availability via WebSocket — the calendar updates live as others hold slots
- Urgency triage queue — High-urgency cases surface at the top of the doctor's dashboard
- Patient health timeline — every visit, prescription, and summary in chronological order
- No-show detection — missed appointments trigger an automatic rebooking offer email
- Admin audit log — every admin action recorded with actor, target, and timestamp
- Idempotency keys on booking to safely handle client retries
- Rate limiting on auth (20/15 min) and booking (30/min) endpoints
- Accessible UI — ARIA labels, keyboard navigation, urgency color badges
- Health check endpoint reporting status of every service dependency
- Seed script with realistic demo data — 5 doctors, 10 patients, appointments, visit notes
