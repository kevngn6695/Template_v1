/**
 * The Express application: middleware, routes, error handling.
 *
 * @remarks
 * Deliberately starts nothing. Keeping construction separate from boot is what
 * lets a test import the app and drive it with Supertest — importing a module
 * that calls `app.listen()` at load time would bind a port and never release it,
 * and one that calls `process.exit()` on failure would take the test runner down
 * with it.
 *
 * @example
 * ```ts
 * import request from 'supertest';
 * import app from '@/app';
 *
 * await request(app).get('/healthz').expect(200);
 * ```
 *
 * @packageDocumentation
 *
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 */

import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'crypto';

import env from '@/config/env.config';
import logger from '@/utils/logger.utils';
import limiter from '@/utils/rate_limit.utils';

import type { CorsOptions } from 'cors';
import type { Response, Request, NextFunction } from 'express';

const app = express();

/* -------------------------------------------------------------------------- */
/* Middleware                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Trust exactly one proxy hop.
 *
 * @remarks
 * Required behind nginx or any load balancer. Without it `req.ip` is the proxy's
 * address on every request, so the rate limiter sees all traffic as one client
 * and throttles everybody the moment one user is busy. It also makes
 * `req.protocol` report http over TLS.
 *
 * `1` means "trust exactly one hop". `true` trusts any `X-Forwarded-For` header,
 * which lets a client spoof its own IP past the limiter.
 */

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  helmet({
    contentSecurityPolicy: env.isProduction,
    crossOriginEmbedderPolicy: false,
  })
);

/**
 * CORS policy.
 *
 * @remarks
 * A blocked origin is answered with `callback(null, false)`, never
 * `callback(new Error(...))`. An `Error` reaches the error middleware and
 * answers 500, as though the server were broken; returning `false` simply omits
 * the CORS headers, which is what a blocked origin should look like and what the
 * browser reports.
 */
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter((origin): origin is string => Boolean(origin));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // No Origin header: same-origin, curl, a health check, a mobile client.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (env.isDevelopment) {
      logger.warn({ origin }, 'CORS: allowing unlisted origin in development');
      callback(null, true);
      return;
    }

    /**
     * `callback(null, false)`, not `callback(new Error(...))`.
     *
     * An Error reaches the error middleware and answers 500, as though the
     * server were broken. Returning false simply omits the CORS headers, which
     * is what a blocked origin should look like and what the browser reports.
     */
    logger.warn({ origin }, 'CORS: blocked origin');
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

app.use(cookieParser(env.COOKIE_SECRET || 'secret'));

app.use(compression({ threshold: 1024 }));

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

app.use('/api/auth', limiter);

/**
 * Request logging with an id on every line, so one request's entries can be
 * grouped later.
 *
 * @remarks
 * Replaces morgan, which writes an unparseable string and cannot correlate.
 *
 * `req.log` is a child logger with the id already bound, so any handler can call
 * `req.log.info(...)` and the line joins the rest of that request.
 *
 * @see {@link https://github.com/pinojs/pino-http | pino-http}
 */
app.use(
  pinoHttp({
    logger,

    /**
     * Reuses an upstream id when nginx or a gateway supplies one, so a request
     * can be followed across services; otherwise mints one.
     *
     * @param req - The incoming request.
     * @param res - The response, stamped with `X-Request-Id` here so the client
     * can quote it in a bug report.
     * @returns The id bound to every log line for this request.
     */
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const id =
        (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },

    /**
     * Maps a response to a log level.
     *
     * @returns `error` for 5xx or a thrown error, `warn` for 4xx, `info`
     * otherwise.
     */
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },

    // Health checks every few seconds would otherwise drown the log.
    autoLogging: { ignore: (req) => req.url === '/healthz' },
  })
);

// No route
app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

/**
 * Body parsing.
 *
 * @remarks
 * `express.json()` **is** body-parser — Express has bundled it since 4.16, and
 * `express.json === bodyParser.json` is literally true. Registering both parses
 * every request body twice and leaves two size limits to keep in sync, so
 * `body-parser` can come out of package.json entirely.
 */
interface BodyParserError {
  type: string;
  status?: number;
  statusCode?: number;
}

function bodyParserStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null;

  const candidate = err as Partial<BodyParserError>;
  const status = candidate.status ?? candidate.statusCode;

  return typeof candidate.type === 'string' && typeof status === 'number'
    ? status
    : null;
}

const BODY_PARSER_MESSAGES: Record<string, string> = {
  'entity.parse.failed': 'Malformed JSON body',
  'entity.too.large': 'Request body is too large',
  'encoding.unsupported': 'Unsupported content encoding',
};

/**
 * Express identifies the error handler by its four parameters, so `next` has
 * to stay even though it is unused. Without this, Express's default handler
 * replies with an HTML page and leaks the stack trace outside production.
 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const clientStatus = bodyParserStatus(err);

  if (clientStatus !== null) {
    const type = (err as BodyParserError).type;
    logger.warn({ err, type }, 'Rejected malformed request body');
    res
      .status(clientStatus)
      .json({ error: BODY_PARSER_MESSAGES[type] ?? 'Invalid request body' });
    return;
  }

  logger.error({ err }, 'Unhandled request error');

  res.status(500).json({
    error: env.isProduction ? 'Internal server error' : String(err),
  });
});

app.use(express.static(path.join(__dirname, 'client/build')));

app.get(/^\/(?!api).*/, (req, res) => {
  // Match all except /api routes
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Server configuration and middleware setup can be added here
app.listen(env.PORT, () => {
  logger.info(
    `Server is running on port http://localhost:${env.PORT} in ${env.NODE_ENV} mode`
  );
});

export default app;
