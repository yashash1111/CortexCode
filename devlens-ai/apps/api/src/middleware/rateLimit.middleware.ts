import rateLimit from 'express-rate-limit';

// Strict rate limiter for login and registration attempts
export const authRateLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
  }
});

// Rate limiter for password reset requests
export const passwordResetRateLimiter: any = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many password reset requests. Please check back in an hour.'
    }
  }
});
