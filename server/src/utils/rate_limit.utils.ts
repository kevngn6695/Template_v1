/**
 * Rate limiting for the auth routes.
 *
 * @packageDocumentation
 *
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 */

import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

import env from '@/config/env.config';
import logger from '@/utils/logger.utils';

/**
 * Length of the sliding window.
 *
 * @remarks
 * No `parseInt` here: `env.config` validated and coerced these at boot, so they
 * arrive as numbers. Parsing a second time is how a `NaN` window slips in
 * unnoticed — `rateLimit` treats `NaN` as "no limit at all".
 */
const windowMs = env.RATE_LIMIT_WINDOW_MS;

/** Requests permitted per window, per client. */
const limit = env.RATE_LIMIT_MAX_REQUESTS;

/** Derived, so the message can never contradict the configured window. */
const windowMinutes = Math.round(windowMs / 60_000);

/**
 * Limiter for `/api/auth`.
 *
 * @remarks
 * Only failed attempts count, so a legitimate user who signs in first time never
 * spends their budget. Drop `skipSuccessfulRequests` to cap total auth traffic
 * instead of just failures.
 *
 * Correct client attribution depends on `app.set('trust proxy', 1)` in `app.ts`.
 * Without it every request behind nginx carries the proxy's IP and the whole
 * world shares one bucket.
 *
 * @example
 * ```ts
 * app.use('/api/auth', limiter);
 * ```
 *
 * @see {@link https://express-rate-limit.mintlify.app | express-rate-limit}
 */
const limiter = rateLimit({
  windowMs,

  /** `limit`, not the deprecated v6 `max` — which warns on every boot. */
  limit,

  standardHeaders: 'draft-8',
  legacyHeaders: false,

  message: {
    error: `Too many requests. Please try again in ${windowMinutes} minute${
      windowMinutes === 1 ? '' : 's'
    }.`,
  },

  skipSuccessfulRequests: true,

  /**
   * Logs the lockout, then answers 429.
   *
   * @param req - The throttled request.
   * @param res - The response to write.
   * @param options - The limiter's resolved configuration.
   *
   * @remarks
   * Lockouts are worth seeing: they are the signature of credential stuffing,
   * and the first thing a user reports when a limit is set too tight.
   */
  handler: (req: Request, res: Response, _next, options) => {
    logger.warn(
      {
        ip: req.ip,
        path: req.originalUrl,
        limit: options.limit,
        windowMs: options.windowMs,
      },
      'Rate limit exceeded'
    );
    res.status(options.statusCode).json(options.message);
  },
});

export default limiter;
