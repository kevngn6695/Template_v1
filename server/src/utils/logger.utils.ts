/**
 * Pino logger: JSON everywhere, prettified on a developer's console.
 *
 * @remarks
 * One calling convention, and it is the opposite of winston's — the metadata
 * object comes **first**, the message second:
 *
 * ```ts
 * logger.error({ err }, 'Query failed');   // correct
 * logger.error('Query failed', { err });   // object silently dropped
 * ```
 *
 * Passing the object second makes pino treat it as a printf interpolation value
 * for a format string with no placeholders, and it is discarded. That is the one
 * rule in this file.
 *
 * There is no format pipeline here on purpose. Errors, timestamps and levels are
 * handled by pino itself, so there is no ordering to get wrong and nothing that
 * fails silently when a line is moved.
 *
 * @example
 * ```ts
 * import logger from '@/utils/logger.utils';
 *
 * logger.info({ userId }, 'Signed in');
 * logger.warn({ ip, path }, 'Rate limit exceeded');
 * logger.error({ err }, 'Could not reach Postgres');
 * ```
 *
 * @packageDocumentation
 *
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 */

import path from 'node:path';

import pino from 'pino';
import type { Level, StreamEntry } from 'pino';
import PinoPretty from 'pino-pretty';

import env from '@/config/env.config';
import { serializeError } from '@/database/utils/errors.utils';

/**
 * Where `error.log` and `combined.log` are written.
 *
 * @defaultValue `./logs` relative to the working directory
 */
const LOG_DIR = env.LOG_DIR ?? path.resolve(process.cwd(), 'logs');

/** The configured level. May be `silent`, which switches the logger off. */
const level = env.LOG_LEVEL;

/**
 * The level applied to individual streams.
 *
 * @remarks
 * A stream's own level cannot be `silent` — pino types it as a real level, and a
 * silent logger emits nothing for the streams to receive anyway.
 */
const streamLevel: Level = level === 'silent' ? 'error' : level;

/* -------------------------------------------------------------------------- */
/* Serializers                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Expands anything logged as `err` into a full object.
 *
 * @param err - The value passed as `{ err }`. Need not be an `Error`.
 * @returns Name, message, stack, and where present the error code, migration
 * details, Postgres fields and a nested `cause`.
 *
 * @remarks
 * Pino serialises an `Error` correctly out of the box — message, stack, and the
 * cause chain folded into the stack string. That is enough for a human, so
 * unlike winston this file needs no serializer just to avoid logging `{}`.
 *
 * {@link serializeError} is used anyway for one reason: it keeps `cause` as a
 * nested object rather than flattening it into text, so the Postgres fields of a
 * wrapped error survive. A `MigrationError` wrapping a unique violation is the
 * case that matters — the outer error says which migration, and only the cause
 * knows which constraint.
 */
const errSerializer = (err: unknown): Record<string, unknown> =>
  serializeError(err);

/* -------------------------------------------------------------------------- */
/* Streams                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every destination this logger writes to.
 *
 * @remarks
 * Built with `multistream`, not `transport`. A pino transport runs in a worker
 * thread, which is faster but means a line logged immediately before
 * `process.exit()` can be lost — the CLI hit exactly that and had to print its
 * last message with `console.error`. multistream stays on the main thread, so
 * what is logged is written.
 */
const streams: StreamEntry[] = [];

if (env.isProduction) {
  // Docker, systemd and Kubernetes all collect stdout, and files inside a
  // container vanish with it. JSON on stdout is what reaches a log stack.
  streams.push({ level: streamLevel, stream: process.stdout });
} else {
  streams.push({
    level: streamLevel,
    stream: PinoPretty({
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,service,env',
      singleLine: false,
    }),
  });
}

/**
 * Opens one log file for appending.
 *
 * @param filename - File name inside {@link LOG_DIR}.
 * @returns A pino destination writing to it.
 *
 * @remarks
 * `sync: true` so a crash does not take the last few lines with it — the ones
 * that explain the crash. `mkdir` because a missing `logs/` directory would
 * otherwise throw at import time, before anything can report why.
 *
 * Size-based rotation is deliberately not done in-process: logrotate, Docker's
 * json-file driver and every hosted log agent already do it, and a logger that
 * renames its own files races with anything tailing them.
 *
 * @internal
 */
const fileStream = (filename: string) =>
  pino.destination({
    dest: path.join(LOG_DIR, filename),
    mkdir: true,
    sync: true,
  });

if (level !== 'silent') {
  streams.push({ level: 'error', stream: fileStream('error.log') });
  streams.push({ level: streamLevel, stream: fileStream('combined.log') });
}

/* -------------------------------------------------------------------------- */
/* Logger                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The application logger.
 *
 * @see {@link https://getpino.io/#/docs/api | pino API}
 */
const logger = pino(
  {
    level,

    /**
     * Fields scrubbed from every line, whatever the call site passed.
     *
     * @remarks
     * `params` is here because query parameters carry passwords, tokens and
     * personal data; `db.ts` logs `paramCount` instead, and this is the second
     * line of defence.
     */
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'password',
        '*.password',
        'token',
        '*.token',
        'secret',
        '*.secret',
        'params',
        '*.params',
      ],
      censor: '[redacted]',
    },

    serializers: { err: errSerializer },

    /** ISO timestamps rather than epoch millis: greppable by eye. */
    timestamp: pino.stdTimeFunctions.isoTime,

    /** Attached to every line, so one log stack can hold several services. */
    base: { service: 'server', env: env.NODE_ENV },

    formatters: {
      /**
       * Writes `level: "error"` rather than `level: 50`.
       *
       * @param label - The level name.
       * @returns The fragment merged into each line.
       *
       * @remarks
       * Costs nothing, and means a human reading the raw file does not need
       * pino's numeric level table.
       */
      level: (label) => ({ level: label }),
    },
  },
  pino.multistream(streams, { dedupe: false })
);

export default logger;
