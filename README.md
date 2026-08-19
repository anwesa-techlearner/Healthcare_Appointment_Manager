# Healthcare Appointment & Follow-up Manager

A clinic-grade appointment platform with Patient, Doctor, and Admin portals, AI-powered triage, Google Calendar integration, and real-time slot availability.

---

## Live Demo

> Deployment instructions: see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

- **Frontend (Vercel):** _set after deployment_
- **Backend API (Render/Railway):** _set after deployment_

**Demo credentials (after running seed):**

| Role | Email | Password |
|---|---|---|
| Admin | admin@clinic.com | Demo@1234 |
| Doctor | dr.sarah.chen@clinic.com | Demo@1234 |
| Doctor | dr.james.okafor@clinic.com | Demo@1234 |
| Patient | alice.johnson@email.com | Demo@1234 |
| Patient | bob.smith@email.com | Demo@1234 |

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Backend | Node.js (TypeScript) + Express | Minimal, well-documented |
| Database | PostgreSQL via Prisma ORM | Strong transactional support for slot concurrency |
| Frontend | React (Vite) + TypeScript + Tailwind CSS | Fast, minimal deps |
| Auth | JWT (access + refresh tokens), bcrypt | No heavy auth-as-a-service dependency |
| Background jobs | BullMQ + Redis (node-cron fallback) | Reminders & retry queues |
| Email | Nodemailer with SendGrid | Free tier friendly |
| Calendar | Google Calendar API v3 | As specified |
| LLM | OpenAI-compatible API (configurable) | Vendor-agnostic |
| Deployment | Render + Vercel + Neon/Supabase + Upstash | All free-tier |

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (Neon/Supabase/Render free tier or local)
- Redis (Upstash free tier or local; optional — set `USE_CRON_FALLBACK=true` to skip)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your DATABASE_URL, JWT secrets, and other values
npm install
npx prisma migrate deploy   # or: npx prisma migrate dev (first time)
npx prisma generate
npm run seed                 # loads demo data
npm run dev                  # starts on port 4000
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to your backend URL
npm install
npm run dev                  # starts on port 5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | Min 32 chars random string |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars random string |
| `REDIS_URL` | ✅* | Redis URL (*not needed if `USE_CRON_FALLBACK=true`) |
| `USE_CRON_FALLBACK` | | `true` to use node-cron instead of BullMQ |
| `SMTP_HOST/PORT/USER/PASS` | | Email sending (SendGrid SMTP) |
| `EMAIL_FROM` | | From address for emails |
| `LLM_API_KEY` | | OpenAI-compatible API key |
| `LLM_BASE_URL` | | API base URL (defaults to OpenAI) |
| `LLM_MODEL` | | Model name (default: `gpt-4o-mini`) |
| `GOOGLE_CLIENT_ID` | | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | | OAuth callback URL |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL (e.g. `https://your-api.onrender.com`) |

---

## Database Schema Summary

```
User            — patients, doctors, admins (role enum)
DoctorProfile   — specialization, bio, slot duration, timezone
DoctorAvailability — working hours per day of week
DoctorLeave     — blocked days (triggers appointment cancellation)
Appointment     — slot hold/confirm/cancel/complete lifecycle
Symptom         — pre-visit symptoms + AI triage JSON
VisitNote       — post-visit notes + AI patient summary
MedicationReminder — parsed from prescriptions, triggers email reminders
NotificationLog — email/calendar notification delivery log with retry state
CalendarEvent   — Google Calendar event tracking
AuditLog        — admin action log
NoShowFollowUp  — no-show detection and rebooking tracking
```

Double-booking prevention: `UNIQUE(doctor_id, slot_start)` DB constraint + transaction — see [SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md).

---

## API Documentation

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Patient self-registration |
| POST | `/api/auth/login` | — | Login (returns access + refresh tokens) |
| POST | `/api/auth/refresh` | — | Refresh access token |
| POST | `/api/auth/logout` | Bearer | Revoke refresh token |
| GET | `/api/auth/me` | Bearer | Current user profile |

### Doctors

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/doctors?q=&specialization=` | Bearer | Search doctors |
| GET | `/api/doctors/:id` | Bearer | Get doctor profile |
| GET | `/api/doctors/:id/slots?date=YYYY-MM-DD` | Bearer | Available booking slots |
| PATCH | `/api/doctors/:id/profile` | doctor/admin | Update profile |
| PUT | `/api/doctors/:id/availability` | doctor/admin | Set working hours |
| POST | `/api/doctors/:id/leaves` | doctor/admin | Add leave day (cascades cancellations) |
| DELETE | `/api/doctors/:id/leaves/:leaveId` | doctor/admin | Remove leave |

### Appointments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/appointments/hold` | patient | Hold a slot (5 min window) |
| POST | `/api/appointments/:id/confirm` | patient | Confirm held slot |
| POST | `/api/appointments/:id/cancel` | patient/doctor/admin | Cancel |
| POST | `/api/appointments/:id/reschedule` | any | Reschedule |
| POST | `/api/appointments/:id/complete` | doctor/admin | Mark completed |
| GET | `/api/appointments/patient/my` | patient | Own appointments |
| GET | `/api/appointments` | admin | All appointments |

### Symptoms & Visit Notes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/appointments/:id/symptoms` | patient | Submit symptoms (triggers AI triage) |
| GET | `/api/appointments/:id/symptoms` | doctor/admin | View AI triage summary |
| POST | `/api/appointments/:id/notes` | doctor | Submit visit notes (triggers AI patient summary) |
| GET | `/api/appointments/:id/notes` | any | View visit note |

### Other

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Service health status |
| GET | `/api/notifications/failed` | admin | Failed notification log |
| GET | `/api/admin/audit-logs` | admin | Admin action audit log |
| GET | `/api/users/:id/timeline` | any | Patient health timeline |
| GET | `/api/calendar/oauth/connect` | Bearer | Start Google OAuth flow |

---

## LLM Prompts (exact)

**Pre-visit triage:**
```
Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>
```

**Post-visit patient summary:**
```
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>
```

Both calls use `response_format: { type: 'json_object' }` for reliable parsing. On failure, the system degrades gracefully (urgency = Unknown; raw notes returned) — booking is never blocked.

---

## Google Calendar OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → OAuth 2.0 Credentials
2. Create OAuth 2.0 Client ID (type: Web Application)
3. Authorized redirect URI: `https://your-api.com/api/calendar/oauth/callback`
4. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to backend `.env`
5. Users connect their calendar via `GET /api/calendar/oauth/connect`

---

## Baseline Features (Required)

- ✅ Conflict-free slot booking with 5-min hold window
- ✅ DB-level double-booking prevention (unique constraint + transaction)
- ✅ Doctor leave → atomic appointment cancellation with notifications
- ✅ Pre-visit AI triage (urgency, chief complaint, suggested questions)
- ✅ Post-visit AI patient-friendly summary
- ✅ LLM graceful failure (never blocks booking/workflow)
- ✅ Email notifications (confirmation, cancellation, reminder)
- ✅ Google Calendar event creation/deletion
- ✅ Notification retry with exponential backoff (1m → 5m → 15m, max 3)
- ✅ Failed notifications admin view
- ✅ Background jobs: slot expiry (1 min), medication reminders (5 min), notification retry (2 min)
- ✅ JWT auth with access + refresh token rotation
- ✅ RBAC enforced at API middleware layer

## Bonus Differentiating Features (Section 8)

- ✅ **Real-time slot availability** via WebSocket — patients see slots update live as others hold them
- ✅ **Urgency-based triage queue** — High-urgency appointments surface at the top of doctor's dashboard
- ✅ **Patient health timeline** — chronological view of all visits, summaries, and prescriptions
- ✅ **Doctor/patient no-show tracking** — automated detection and rebooking offer email
- ✅ **Audit log** — all admin actions logged with actor, target, timestamp
- ✅ **Idempotency keys** on booking confirmation endpoint
- ✅ **Rate limiting** — auth endpoints (20 req/15 min), booking (30 req/min), general (200 req/min)
- ✅ **Accessible, responsive UI** — ARIA labels, keyboard navigation, urgency badge color system
- ✅ **Seed script** with 5 doctors (different specializations), 10 patients, pre-filled leaves, sample appointments
- ✅ **Health check endpoint** (`/health`) — reports DB, Redis, LLM, email service status
