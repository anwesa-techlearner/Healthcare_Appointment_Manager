import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port: parseInt(optional('PORT', '4000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),

  databaseUrl: required('DATABASE_URL'),

  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
  useCronFallback: optional('USE_CRON_FALLBACK', 'false') === 'true',

  smtp: {
    host: optional('SMTP_HOST', 'smtp.sendgrid.net'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('EMAIL_FROM', 'noreply@clinic.com'),
    fromName: optional('EMAIL_FROM_NAME', 'HealthCare Clinic'),
  },

  llm: {
    apiKey: optional('LLM_API_KEY', ''),
    baseUrl: optional('LLM_BASE_URL', 'https://api.openai.com/v1'),
    model: optional('LLM_MODEL', 'gpt-4o-mini'),
    timeoutMs: parseInt(optional('LLM_TIMEOUT_MS', '10000'), 10),
  },

  google: {
    clientId: optional('GOOGLE_CLIENT_ID', ''),
    clientSecret: optional('GOOGLE_CLIENT_SECRET', ''),
    redirectUri: optional('GOOGLE_REDIRECT_URI', 'http://localhost:4000/api/calendar/oauth/callback'),
  },
};
