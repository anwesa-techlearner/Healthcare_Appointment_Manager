# System Design: Healthcare Appointment Manager

_≤800 words — covers the four critical design areas._

---

## 1. Double-Booking Prevention & Slot Hold Mechanism

The booking flow is a two-step process: **hold → confirm**.

**Hold:** When a patient selects a slot, the system executes a DB transaction that:
1. Expires any stale `held` rows for that slot (status update, not delete)
2. Inserts a new `Appointment` row with `status = held` and `hold_expires_at = now() + 5 minutes`

The schema has a `UNIQUE(doctor_id, slot_start)` constraint on `Appointment`. This is the **real double-booking guard** — not an application-level check. If two concurrent requests race to insert the same slot, one succeeds and the other receives a `P2002` unique constraint violation from Postgres. The API catches this and returns a clear 409 "slot already held" error.

Why not an application-level `SELECT` then `INSERT`? Because between the SELECT and the INSERT, a second request can slip in. The unique constraint enforces atomicity at the database level, regardless of application concurrency.

**Confirm:** The patient has 5 minutes to complete the booking. The confirm endpoint uses a transaction to re-read the appointment row, validates `status = held` and `hold_expires_at > now()`, and transitions to `confirmed`. If the hold has expired, the confirm is rejected.

**Idempotency:** The hold endpoint accepts an optional `Idempotency-Key` header. If the same key is re-submitted (e.g., client retry on network failure), the existing appointment is returned rather than creating a duplicate.

**Background expiry job** (runs every 1 minute): Any appointment stuck in `held` past its `hold_expires_at` is transitioned to `cancelled`. This frees the slot without requiring patient action, keeping the calendar accurate.

---

## 2. Doctor Leave Conflict Handling

When a doctor (or admin) adds a leave day, the entire operation is wrapped in a **single Prisma transaction**:

1. Insert the `DoctorLeave` row
2. Query all `confirmed` and `held` appointments for that doctor on that date
3. Bulk-update them to `cancelled` with `cancelled_reason = 'doctor_leave'`

The transaction guarantees atomicity: if any step fails, neither the leave nor the cancellations are persisted. This prevents the state where leave is recorded but some appointments remain confirmed.

After the transaction commits, notification jobs are enqueued (outside the transaction, so a queue failure doesn't roll back the leave). Patients receive email + calendar cancellation notifications via the retry-backed notification pipeline.

---

## 3. LLM Integration & Graceful Failure

Both LLM calls (pre-visit triage and post-visit summary) share the same resiliency pattern:

- A **hard timeout** (configurable, default 10 seconds) prevents slow LLM responses from blocking user workflows
- The call is wrapped in try/catch: on any error (network, timeout, parse failure, invalid schema), the system falls back gracefully:
  - Pre-visit: `urgency_level = "Unknown"`, `chief_complaint` = truncated raw text, empty suggested questions — booking proceeds normally
  - Post-visit: `ai_generated = false`, the doctor's raw notes are stored as the patient summary — the patient still receives something readable
- Failures are logged with full error detail for operational monitoring but are never surfaced as user-facing errors

The system instruction enforces JSON output (`response_format: { type: 'json_object' }`), which reduces but doesn't eliminate parse failures — hence the catch.

---

## 4. Notification Failure Handling

Every notification attempt (email or calendar) is tracked in `NotificationLog`. The flow:

1. When an appointment is confirmed/cancelled, `enqueueNotification()` creates a `NotificationLog` row with `status = pending` and `nextRetryAt = now()`
2. The background notification retry job runs every 2 minutes (or BullMQ workers process continuously when Redis is available)
3. For each pending notification due for processing (`nextRetryAt ≤ now`, `attempts < 3`):
   - Attempt delivery (SMTP send or Calendar API call)
   - **Success:** mark `status = sent`
   - **Failure:** increment `attempts`, compute next retry time via exponential backoff (1 min → 5 min → 15 min), update `nextRetryAt`
4. After 3 failures, mark `status = failed` with the last error message
5. The admin dashboard surfaces all `failed` notifications so staff can investigate (bad email address, SMTP credentials, etc.)

The Google Calendar integration stores the `google_event_id` on first creation. This allows updates (reschedule) and deletes (cancellation) without a search query — a `CalendarEvent` row exists for each user (patient + doctor) for each appointment.

**Booking correctness is never coupled to notification success.** An SMTP outage or calendar API error logs a failure but the appointment remains confirmed.

---

## Architecture Summary

```
Client (React/WS)
    │
    ▼
Express API (JWT auth, RBAC middleware, rate limiting)
    │
    ├─ Prisma ORM ──► PostgreSQL (transactions, unique constraints)
    ├─ BullMQ ──────► Redis (notification queues, retry workers)
    ├─ node-cron ───► Slot expiry, medication reminders, no-show detection
    ├─ Nodemailer ──► SMTP (SendGrid)
    ├─ googleapis ──► Google Calendar API
    └─ OpenAI SDK ──► LLM (any OpenAI-compatible endpoint)
```
