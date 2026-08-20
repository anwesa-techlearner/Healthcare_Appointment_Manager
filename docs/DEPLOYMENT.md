# Deployment Guide — Free Tier Hosting

Full free-tier deployment: **Neon** (PostgreSQL) + **Upstash** (Redis) + **Render** (backend) + **Vercel** (frontend).

---

## 1. Database — Neon (free PostgreSQL)

1. Go to [neon.tech](https://neon.tech) → Sign up → Create project
2. Copy the **connection string** (format: `postgresql://user:pass@host/db?sslmode=require`)
3. Save as `DATABASE_URL` in your backend environment

Alternative: [Supabase](https://supabase.com) or [Render PostgreSQL](https://render.com) (also free tier)

---

## 2. Redis — Upstash (free serverless Redis)

1. Go to [upstash.com](https://upstash.com) → Create Database → Select "Redis"
2. Copy the **Redis URL** (format: `rediss://user:pass@host:port`)
3. Save as `REDIS_URL` in your backend environment

**No Redis?** Set `USE_CRON_FALLBACK=true` — the app switches to node-cron for all background jobs. No queue features lost; only reduced throughput for high-volume notification processing.

---

## 3. Backend — Render (free web service)

1. Go to [render.com](https://render.com) → New → Web Service → Connect your GitHub repo
2. **Settings:**
   - Root directory: `backend`
   - Build command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - Start command: `node dist/server.js`
   - Environment: Node
3. Add all environment variables from `backend/.env.example` under the Environment tab
4. **Important:** Set `NODE_ENV=production` and your actual `DATABASE_URL`, `JWT_ACCESS_SECRET`, etc.
5. Deploy → wait for build → note your service URL (e.g. `https://healthcare-api.onrender.com`)

**Seed demo data (one time):**
```bash
# From your local machine with DATABASE_URL pointing to Neon
cd backend
npm run seed
```

---

## 4. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. **Settings:**
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://healthcare-api.onrender.com`)
4. Deploy → note your frontend URL (e.g. `https://healthcare-xyz.vercel.app`)

---

## 5. CORS Update

After deployment, update the backend `FRONTEND_URL` environment variable on Render to your Vercel URL:
```
FRONTEND_URL=https://healthcare-xyz.vercel.app
```

This ensures CORS allows your frontend to call the API.

---

## 6. Google Calendar OAuth (optional)

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web Application type)
3. Authorized redirect URI: `https://healthcare-api.onrender.com/api/calendar/oauth/callback`
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in Render env vars
5. Users connect their Google Calendar via the "Connect Calendar" option in their profile

---

## 7. LLM API Key

The app works with any OpenAI-compatible API. **Gemini is recommended** — free tier, no credit card needed.

### Google Gemini (recommended)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) → **Get API key**
2. Set on Render:
   - `LLM_API_KEY=AIza...your_key`
   - `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`
   - `LLM_MODEL=gemini-2.5-flash`
   - `LLM_TIMEOUT_MS=15000`

Free tier limits: **10 RPM / 250 requests per day** (more than sufficient for a clinic demo).
For higher throughput use `gemini-2.5-flash-lite` (15 RPM / 1,000 RPD).

> ⚠️ `gemini-1.5-flash` and `gemini-2.0-flash` are retired as of mid-2026. Use `gemini-2.5-flash` or newer.

### Other providers

- **OpenAI:** `LLM_BASE_URL=https://api.openai.com/v1`, `LLM_MODEL=gpt-4o-mini`
- **Groq (free tier):** `LLM_BASE_URL=https://api.groq.com/openai/v1`, `LLM_MODEL=llama-3.1-8b-instant`

If `LLM_API_KEY` is empty the system runs without AI summaries — all booking flows still work normally.

---

## 8. Email (SendGrid)

1. [SendGrid](https://sendgrid.com) → sign up → Settings → API Keys → Create API key
2. Set:
   - `SMTP_HOST=smtp.sendgrid.net`
   - `SMTP_PORT=587`
   - `SMTP_USER=apikey`
   - `SMTP_PASS=<your_sendgrid_api_key>`
   - `EMAIL_FROM=noreply@yourdomain.com`

If email is not configured, notifications fail gracefully (logged, retried, eventually marked failed in admin panel).

---

## 9. Verify Deployment

```bash
# Health check
curl https://healthcare-api.onrender.com/health

# Expected response:
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok",
    "email": "unavailable",    # if not configured
    "calendar": "not_configured"  # if no Google OAuth
  }
}
```

---

## Environment Variable Checklist

| Variable | Where | Required |
|---|---|---|
| `DATABASE_URL` | Render | ✅ |
| `JWT_ACCESS_SECRET` | Render | ✅ |
| `JWT_REFRESH_SECRET` | Render | ✅ |
| `FRONTEND_URL` | Render | ✅ |
| `REDIS_URL` | Render | ✅ (or USE_CRON_FALLBACK=true) |
| `SMTP_*` | Render | Optional |
| `LLM_API_KEY` | Render | Optional |
| `GOOGLE_*` | Render | Optional |
| `VITE_API_URL` | Vercel | ✅ |
