/**
 *
 */
import { Pool } from 'pg';
import type { QueryResultRow, QueryResult, PoolClient } from 'pg';

/**
 *
 */
import { DatabaseError, isRetryableError } from '@/database/utils/errors.utils';
import logger from '@/utils/logger.utils';
import env from '@/config/env.config';

const SLOW_QUERY_MS = 200;
let closed = false;

const target = `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

/**
 *
 */
const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  database: env.DB_NAME,
  password: env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  logger.debug(
    `✅ Connected to ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME} database successfully`
  );
});

pool.on('error', (err) => {
  logger.error({ err }, '❌ Idle Postgres client errored');
});

/**
 *
 * @param text
 * @param param
 * @returns
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params ? [...params] : undefined);
    const duration = Date.now() - start;

    if (duration >= SLOW_QUERY_MS) {
      logger.warn({ text, duration, rows: result.rowCount }, 'Slow query');
    } else {
      logger.debug({ text, duration, rows: result.rowCount }, 'Query executed');
    }

    return result;
  } catch (err) {
    /**
     * The statement text is safe to log; the parameters are not — they hold
     * whatever the caller passed, which is where passwords, tokens and
     * personal data live. Only the shape is recorded.
     */
    logger.error(
      {
        err,
        text,
        paramCount: params?.length ?? 0,
      },
      'Query failed'
    );
    throw err;
  }
}

export async function connectDatabase(
  retries = 5,
  delayMs = 1_000
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }

      logger.info(`✅ PostgresSQL connected: ${target}`);
      return;
    } catch (err) {
      // A bad password or a missing database will never succeed on attempt 5.
      const worthRetrying = isRetryableError(err);

      if (attempt === retries || !worthRetrying) {
        logger.error(
          {
            err,
            attempts: attempt,
          },
          `❌ Could not reach Postgres at ${target}`
        );
        throw new DatabaseError(`Could not connect to Postgres at ${target}`, {
          cause: err,
        });
      }

      logger.warn(
        { err },
        `Postgres not ready (attempt ${attempt}/${retries}), retrying…`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

/**
 *
 */
export async function disconnectDatabase(): Promise<void> {
  if (closed) return;
  closed = true;

  await pool.end();
  logger.info('Postgres pool closed');
}

/**
 *
 * @param fn
 * @returns
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch((rollbackErr: unknown) => {
      logger.error('ROLLBACK failed; connection is likely gone');
    });
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
