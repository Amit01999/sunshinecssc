import rateLimit from "express-rate-limit";
import { env } from "../config/env";

// Rate limiting is genuine security behavior (verified manually against a running server),
// but it has no place gating automated tests: a single test file can legitimately log in
// far more than 20 times across its cases while sharing one Express app/limiter instance.
const skipInTest = () => env.isTest;

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: "Too many password reset requests. Please try again later." },
});

export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: "Too many requests. Please slow down." },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});
