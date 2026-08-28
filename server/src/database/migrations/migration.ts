/**
 * Migration runner — the library behind the `db:*` scripts.
 *
 * @remarks
 * `cli/init.ts` is the entry point that drives this module; the individual
 * migrations live in `migrations/controllers/`.
 *
 * Three invariants hold everything together:
 *
 * 1. Every migration runs in its own transaction, so a failure leaves nothing
 *    half-applied.
 * 2. A Postgres advisory lock is held for the whole run, so two instances
 *    booting together cannot race.
 * 3. Nothing is swallowed. A failure throws all the way out, so the CLI exits
 *    non-zero and a deploy stops.
 *
 * @packageDocumentation
 *
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 */

import type { PoolClient } from 'pg';

import pool from '@/database/db';
import logger from '@/utils/logger.utils';
import {
  MigrationError,
  MigrationLockError,
} from '@/database/utils/errors.utils';

import * as migration001 from '@/database/migrations/controllers/001_migration_table.controller';

/* -------------------------------------------------------------------------- */
/* Registry                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The contract every migration file implements.
 *
 * @remarks
 * Both hooks take a `PoolClient`, never a `Pool`. Widening the parameter would
 * let a migration run its DDL on a different connection from the `BEGIN`,
 * silently placing the change outside the transaction — the whole rollback
 * guarantee rests on this one type.
 *
 * @example
 * ```ts
 * export async function up(client: PoolClient): Promise<void> {
 *   await client.query('CREATE TABLE users (id SERIAL PRIMARY KEY)');
 * }
 *
 * export async function down(client: PoolClient): Promise<void> {
 *   await client.query('DROP TABLE users');
 * }
 * ```
 */
export interface Migration {
  /** Applies the change. Runs inside a transaction opened by the runner. */
  up(client: PoolClient): Promise<void>;
  /** Reverses {@link Migration.up}. Runs inside its own transaction. */
  down(client: PoolClient): Promise<void>;
}

/**
 * Migration name to implementation.
 *
 * @remarks
 * Injectable rather than global so the test suite can drive the runner with a
 * registry of its own instead of the real migrations.
 */
export type MigrationRegistry = Record<string, Migration>;

/**
 * The application's migrations, in the order they were written.
 *
 * @remarks
 * The key is the name recorded in the `migrations` table. Keep it identical to
 * the file's numeric prefix: ordering comes from the key, and a mismatch
 * between key and import is invisible until a rollback runs the wrong file.
 */
export const migrations: MigrationRegistry = {
  '001_migration_table': migration001,
};

/**
 * Registry entries sorted by name.
 *
 * @param registry - The migrations to order.
 * @returns Name/implementation pairs, oldest first.
 *
 * @remarks
 * Sorted explicitly, never left to object insertion order — that happens to
 * work today and stops working the moment someone reorders the imports.
 *
 * @internal
 */
function orderedMigrations(
  registry: MigrationRegistry = migrations
): [string, Migration][] {
  return Object.entries(registry).sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Advisory lock key shared by every instance.
 *
 * @remarks
 * Any 64-bit integer works; it only has to be identical across processes.
 */
const MIGRATION_LOCK_ID = 8_675_309;

/**
 * How long to wait for another instance's run before giving up.
 *
 * @defaultValue 30 seconds
 */
const LOCK_TIMEOUT_MS = 30_000;

/**
 * Delay between attempts to take the lock.
 *
 * @defaultValue 1 second
 */
const LOCK_RETRY_MS = 1_000;

/* -------------------------------------------------------------------------- */
/* Bookkeeping                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Creates the `migrations` bookkeeping table if it does not exist.
 *
 * @param client - Connection to run the DDL on.
 *
 * @remarks
 * `UNIQUE` on `name` is what makes recording trustworthy — without it the same
 * migration can be written twice and {@link hasMigrationRun} starts lying.
 */
export async function createMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id          SERIAL       PRIMARY KEY,
      name        VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Reports whether a migration has already been applied.
 *
 * @param client - Connection to query on.
 * @param name - Registry key of the migration.
 * @returns `true` when a row for `name` exists in `migrations`.
 * @throws The underlying Postgres error if the query fails.
 *
 * @remarks
 * There is no try/catch here on purpose. Returning `false` when the database
 * cannot answer would make the runner re-apply a migration that is already in
 * place — the worst possible response to a transient connection error.
 */
export async function hasMigrationRun(
  client: PoolClient,
  name: string
): Promise<boolean> {
  const result = await client.query(
    'SELECT 1 FROM migrations WHERE name = $1',
    [name]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Records a migration as applied.
 *
 * @param client - Connection to insert on. Pass the transaction's client so the
 * record commits with the migration itself.
 * @param name - Registry key to record.
 *
 * @remarks
 * The column list is required. `INSERT INTO migrations VALUES ($1)` targets the
 * first column — `id SERIAL` — and fails with "invalid input syntax for type
 * integer".
 */
export async function recordMigration(
  client: PoolClient,
  name: string
): Promise<void> {
  await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
}

/**
 * Deletes a migration's record, marking it un-applied.
 *
 * @param client - Connection to delete on, normally the transaction's client.
 * @param name - Registry key to remove.
 * @returns `true` when a row was actually deleted.
 */
export async function removeMigration(
  client: PoolClient,
  name: string
): Promise<boolean> {
  const result = await client.query('DELETE FROM migrations WHERE name = $1', [
    name,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Every migration name recorded in the database, sorted.
 *
 * @returns Applied migration names, oldest first.
 *
 * @remarks
 * The `SELECT` runs on the same `client` as the `CREATE TABLE` above it.
 * Querying `pool` instead can land on a different connection, where the table
 * may not exist yet.
 */
export async function appliedMigrations(): Promise<string[]> {
  const client = await pool.connect();

  try {
    await createMigrationsTable(client);

    const { rows } = await client.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY name'
    );
    return rows.map((row) => row.name);
  } finally {
    client.release();
  }
}

/**
 * Every known migration paired with whether it has run.
 *
 * @param registry - Migrations to report on.
 * @returns One entry per registered migration, oldest first.
 *
 * @see The `db:status` script, which prints this.
 */
export async function migrationStatus(
  registry: MigrationRegistry = migrations
): Promise<{ name: string; applied: boolean }[]> {
  const applied = new Set(await appliedMigrations());
  return orderedMigrations(registry).map(([name]) => ({
    name,
    applied: applied.has(name),
  }));
}

/* -------------------------------------------------------------------------- */
/* Locking                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Takes the advisory lock, retrying until {@link LOCK_TIMEOUT_MS} expires.
 *
 * @param client - Connection that will own the lock for its session.
 * @throws {@link MigrationLockError} when the timeout expires with the lock
 * still held elsewhere.
 *
 * @remarks
 * `pg_try_advisory_lock` returns immediately rather than blocking, which is the
 * difference between a deploy that reports "another migration is running" and
 * one that hangs with no output until someone kills the pod. Retrying preserves
 * the friendly behaviour of waiting out a run that finishes in two seconds.
 *
 * @internal
 */
async function acquireLock(client: PoolClient): Promise<void> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let waited = false;

  for (;;) {
    const { rows } = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [MIGRATION_LOCK_ID]
    );

    if (rows[0]?.locked) {
      if (waited) logger.info('Migration lock acquired');
      return;
    }

    if (Date.now() >= deadline) {
      throw new MigrationLockError(
        `Another migration is already running (waited ${LOCK_TIMEOUT_MS / 1000}s)`
      );
    }

    if (!waited) {
      logger.info('Another migration is in progress, waiting…');
      waited = true;
    }

    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
  }
}

/**
 * Runs `work` while holding the migration lock.
 *
 * @typeParam T - Whatever `work` resolves to.
 * @param work - Callback invoked with the locked connection.
 * @returns The value `work` resolves to.
 * @throws {@link MigrationLockError} if the lock cannot be taken; otherwise
 * whatever `work` throws, unwrapped.
 *
 * @remarks
 * `client.release()` is the last statement of `finally`, deliberately outside
 * the unlock's try/catch. Releasing only on the failure path leaks one pooled
 * connection per run; after `max` runs the pool is exhausted and the next
 * `connect()` waits forever.
 *
 * The lock is session-scoped, so even a killed process releases it when the
 * connection closes — there is no stuck-lock recovery to write.
 */
export async function withMigrationLock<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await acquireLock(client);
    await createMigrationsTable(client);
    return await work(client);
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    } catch (err) {
      // Failing to release on a dead connection is not worth failing the run.
      logger.warn({ err }, 'Could not release the migration lock');
    }

    client.release();
  }
}

/**
 * Wraps `work` in `BEGIN` / `COMMIT`, rolling back on any throw.
 *
 * @param client - Connection to run the transaction on.
 * @param work - Statements to run inside it.
 * @throws Whatever `work` throws, after the rollback is attempted.
 *
 * @remarks
 * The `ROLLBACK` is itself guarded: on a dead connection it throws, and an
 * unguarded rollback would replace the real error with a misleading one.
 *
 * @internal
 */
async function inTransaction(
  client: PoolClient,
  work: (client: PoolClient) => Promise<void>
): Promise<void> {
  await client.query('BEGIN');

  try {
    await work(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* Apply                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Applies every migration that has not run yet, oldest first.
 *
 * @param registry - Migrations to apply.
 * @throws {@link MigrationError} naming the migration that failed, with the
 * original database error as its `cause`.
 * @throws {@link MigrationLockError} if another instance holds the lock.
 *
 * @remarks
 * Safe to call on every boot: applied migrations are skipped.
 *
 * There is no outer try/catch. One that logged and returned would make this
 * resolve successfully after a migration failed — the CLI would then exit 0 and
 * the deploy would proceed against a broken schema.
 *
 * @example
 * ```bash
 * npm run db:up
 * ```
 */
export async function runMigration(
  registry: MigrationRegistry = migrations
): Promise<void> {
  await withMigrationLock(async (client) => {
    logger.info('Starting database migrations…');
    let applied = 0;

    for (const [name, migration] of orderedMigrations(registry)) {
      // Apply what has NOT run. The inverted test — skipping what has not run
      // — is rollback logic, and applies nothing at all.
      if (await hasMigrationRun(client, name)) {
        logger.debug(`Already applied, skipping: ${name}`);
        continue;
      }

      logger.info(`Applying migration: ${name}`);

      try {
        await inTransaction(client, async (tx) => {
          await migration.up(tx);
          await recordMigration(tx, name);
        });
      } catch (err) {
        // Stop here: later migrations assume this one succeeded.
        const failure = new MigrationError(name, 'up', { cause: err });
        logger.error({ err: failure }, failure.message);
        throw failure;
      }

      applied += 1;
    }

    logger.info(
      applied === 0
        ? 'Database already up to date'
        : `Applied ${applied} migration(s)`
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Rollback                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Rolls back applied migrations, newest first.
 *
 * @param steps - How many to undo. Omit to roll back everything.
 * @param registry - Migrations to roll back.
 * @throws {@link MigrationError} naming the migration whose `down` failed.
 * @throws {@link MigrationLockError} if another instance holds the lock.
 *
 * @example
 * ```bash
 * npm run db:down          # undo the most recent migration
 * ```
 */
export async function rollbackMigration(
  steps?: number,
  registry: MigrationRegistry = migrations
): Promise<void> {
  await withMigrationLock(async (client) => {
    const ordered = orderedMigrations(registry).reverse();
    const limit = steps ?? ordered.length;

    logger.info(
      `Rolling back ${steps ? `${steps} migration${steps > 1 ? 's' : ''}` : 'all migrations'}…`
    );
    let rolledBack = 0;

    for (const [name, migration] of ordered) {
      if (rolledBack >= limit) break;

      if (!(await hasMigrationRun(client, name))) {
        logger.debug(`Not applied, skipping rollback: ${name}`);
        continue;
      }

      logger.info(`Rolling back migration: ${name}`);

      try {
        await inTransaction(client, async (tx) => {
          await migration.down(tx);
          await removeMigration(tx, name);
        });
      } catch (err) {
        const failure = new MigrationError(name, 'down', { cause: err });
        logger.error({ err: failure }, failure.message);
        throw failure;
      }

      rolledBack += 1;
    }

    logger.info(`Rolled back ${rolledBack} migration(s)`);
  });
}

/**
 * Rolls back exactly one migration.
 *
 * @throws {@link MigrationError} if the migration's `down` fails.
 * @see {@link rollbackMigration}
 */
export async function rollbackLastMigration(): Promise<void> {
  await rollbackMigration(1);
}

/* -------------------------------------------------------------------------- */
/* Destructive helpers — development only                                      */
/* -------------------------------------------------------------------------- */

/**
 * Refuses a destructive operation when `NODE_ENV` is `production`.
 *
 * @param action - Phrase describing what was attempted, used in the message.
 * @throws {@link Error} in production, always.
 *
 * @internal
 */
function assertNotProduction(action: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Refusing to ${action} in production.`);
  }
}

/**
 * Rolls everything back, then applies it again.
 *
 * @param registry - Migrations to reset.
 * @throws {@link Error} when `NODE_ENV` is `production`.
 * @throws {@link MigrationError} if any step fails.
 *
 * @example
 * ```bash
 * npm run db:fresh
 * ```
 */
export async function resetDatabase(
  registry: MigrationRegistry = migrations
): Promise<void> {
  assertNotProduction('reset the database');

  logger.info('Resetting the database…');
  await rollbackMigration(undefined, registry);
  await runMigration(registry);
  logger.info('Database reset successfully');
}

/**
 * Drops the `public` schema and recreates it empty.
 *
 * @throws {@link Error} when `NODE_ENV` is `production`.
 *
 * @remarks
 * Recreating the schema cannot drift as the database grows; a hardcoded list of
 * `DROP TABLE` statements silently stops covering tables added later.
 *
 * Unlike {@link resetDatabase} this does not re-apply anything — run
 * {@link runMigration} afterwards.
 *
 * @example
 * ```bash
 * npm run db:drop && npm run db:up
 * ```
 */
export async function dropAllMigrations(): Promise<void> {
  assertNotProduction('drop the schema');

  const client = await pool.connect();

  try {
    logger.warn('Dropping the entire public schema…');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    logger.info('Schema dropped and recreated');
  } finally {
    client.release();
  }
}
