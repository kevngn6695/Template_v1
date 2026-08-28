/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 * Environment configuration — the single place `.env` is read and validated.
 *
 * Everything else imports `env` and trusts it: values arrive coerced to the
 * right type, so no other file needs `parseInt`, a `|| 'localhost'` fallback,
 * or a `process.env` lookup. A missing or malformed variable stops the process
 * here, naming it, instead of surfacing later as a confusing auth error or a
 * NaN timeout.
 *
 * It also refuses to start in production with placeholder secrets still in
 * place — the failure mode that turns "change_in_production" into a live
 * signing key nobody noticed.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Loaded once, here. No other module should call this.
dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Values that look like they were copied from an example file and never
 * changed. Harmless in development; a signing key anyone can guess in
 * production.
 */
const PLACEHOLDER =
  /^(your[_-]|change[_-]?me|changeme|placeholder|example|secret$|test$)/i;

/** A secret must be long, and must not still be the template value. */
const secret = (name: string, minLength = 32) =>
  z
    .string()
    .min(1, `${name} is required`)
    .superRefine((value, ctx) => {
      if (!isProduction) return;

      if (value.length < minLength) {
        ctx.addIssue({
          code: 'custom',
          message: `${name} must be at least ${minLength} characters in production`,
        });
      }

      if (PLACEHOLDER.test(value) || value.includes('change_in_production')) {
        ctx.addIssue({
          code: 'custom',
          message: `${name} is still the placeholder value — generate a real one`,
        });
      }
    });

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.url().optional(),

  /* --- Postgres ---------------------------------------------------------- */
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),

  /**
   * Force TLS outside production too (managed Postgres in staging, say).
   * Certificate verification is always on; supply the CA when it is not in
   * the system trust store.
   */
  DB_SSL: z.stringbool().default(false),
  DB_SSL_CA: z.string().optional(),

  /* --- Sessions and cookies ---------------------------------------------- */
  SESSION_SECRET: secret('SESSION_SECRET'),
  COOKIE_SECRET: secret('COOKIE_SECRET'),

  /**
   * A hostname, not a label. `COOKIE_DOMAIN=cookie_domain` is silently wrong:
   * the browser rejects the Set-Cookie and every request arrives without a
   * session, with nothing in the logs to say why. Leave it unset unless you
   * are actually sharing cookies across subdomains.
   */
  COOKIE_DOMAIN: z
    .string()
    .regex(
      /^\.?([a-z0-9-]+\.)+[a-z]{2,}$|^localhost$/i,
      'COOKIE_DOMAIN must be a hostname such as .example.com, or be left unset'
    )
    .optional(),

  /* --- Security ----------------------------------------------------------- */
  /**
   * Only meaningful if you hash with bcrypt. The dependency review moved this
   * project to argon2 — if that stands, drop BCRYPT_ROUNDS and configure
   * argon2's memory/time cost instead. Keeping both hashers is the thing to
   * avoid: two ways to store a password is one way too many.
   */
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  /* --- First-run admin ---------------------------------------------------- */
  /**
   * Seeding an admin with a known password is one of the most common ways a
   * deployment gets owned — `Admin@123` on a public host is found by scanners
   * within hours. Optional on purpose: in production, either set a strong one
   * or leave both unset and create the first admin through a one-time setup
   * flow.
   */
  DEFAULT_ADMIN_EMAIL: z.email().optional(),
  DEFAULT_ADMIN_PASSWORD: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (!value || !isProduction) return;

      if (
        value.length < 16 ||
        PLACEHOLDER.test(value) ||
        /^admin/i.test(value)
      ) {
        ctx.addIssue({
          code: 'custom',
          message:
            'DEFAULT_ADMIN_PASSWORD is weak or a placeholder — use 16+ random characters, or unset it and seed the admin manually',
        });
      }
    }),

  /* --- Logging ------------------------------------------------------------ */
  /** 'silent' is pino's own level for "log nothing" — used by the test suite. */
  LOG_LEVEL: z
    .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .optional(),
  /** When set, logs are also written to rotating daily files there. */
  LOG_DIR: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  // console, not the logger: the logger imports this module.
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  console.error('Copy .env.example to .env and fill in the missing values.\n');
  process.exit(1);
}

const raw = parsed.data;

const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
  isTest: raw.NODE_ENV === 'test',
  LOG_LEVEL:
    raw.LOG_LEVEL ?? (raw.NODE_ENV === 'production' ? 'info' : 'debug'),
} as const;

export type Env = typeof env;

export default env;
