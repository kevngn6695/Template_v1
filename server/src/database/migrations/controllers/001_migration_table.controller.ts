/**
 * Bookkeeping table for the migration runner.
 *
 * @remarks
 * **Consider deleting this file.** The runner must create `migrations` before it
 * can read which migrations have run — including this one — so
 * `createMigrationsTable()` already does it, outside the migration list. That
 * makes {@link up} a no-op in practice, and {@link down} removes the ledger
 * recording what was rolled back, after which the next boot sees an empty table
 * and re-applies everything.
 *
 * It is written correctly below in case you would rather the runner not create
 * the table, and prefer migration 001 to bootstrap a truly empty database. That
 * is a coherent choice — it just means {@link down} has to run last.
 *
 * Otherwise: delete it, drop the entry from the registry in `migration.ts`, and
 * let 001 be your first real schema change.
 *
 * @packageDocumentation
 *
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 */

import type { PoolClient } from 'pg';

/**
 * Creates the `migrations` bookkeeping table.
 *
 * @param client - A client already inside the runner's transaction. A
 * `PoolClient`, never a `Pool`: given a pool, each statement could land on a
 * different connection and the DDL would run outside the transaction entirely.
 * @throws The underlying Postgres error, deliberately uncaught.
 *
 * @remarks
 * There is no try/catch on purpose. A migration that fails must throw so the
 * runner can roll back and stop. Catching here lets the transaction `COMMIT` and
 * the migration be recorded as applied when nothing happened — after which it is
 * skipped forever.
 */
export const up = async (client: PoolClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id          SERIAL       PRIMARY KEY,
      name        VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
};

/**
 * Drops the `migrations` table.
 *
 * @param client - A client already inside the runner's transaction.
 * @throws The underlying Postgres error, deliberately uncaught.
 *
 * @remarks
 * Only reached by a full rollback, and it must run last — anything after it has
 * no way to record that it was rolled back.
 */
export const down = async (client: PoolClient): Promise<void> => {
  await client.query('DROP TABLE IF EXISTS migrations');
};
