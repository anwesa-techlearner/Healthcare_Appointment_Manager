import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Skip rate limiting for OPTIONS preflight requests.
// Without this, the rate limiter can respond to preflight before
// CORS headers are applied, causing the browser to report a CORS error
// even though the real cause is a rate-limit response without CORS headers.
function skipPreflight(req: Request): boolean {
  return req.method === 'OPTIONS';
}

/** Strict limiter for auth endpoints (prevents brute force) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  message: { error: 'Too many requests, please try again later.' },
});

/** Booking endpoint limiter */
export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  message: { error: 'Too many booking requests, please slow down.' },
});

/** General API limiter */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  message: { error: 'Too many requests.' },
});
