/**
 * @copyright 2026 - present, Heniseeyou ,LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import pool from '@/database/db';
import logger from '@/utils/logger.utils';

import * as migration001 from '@/database/migrations/controllers/002_migration_table.controller';
import type { Pool, PoolClient } from 'pg';

//
export interface Migration {
  up(client: Pool | PoolClient): Promise<void>;
  down(client: Pool | PoolClient): Promise<void>;
}

const migrations: Record<string, Migration> = {
  '001_migration_table': migration001,
};

// Sort
function orderedMigrations(): [string, Migration][] {
  return Object.entries(migrations).sort(([a], [b]) => a.localeCompare(b));
}

const MIGRATION_LOCK_ID = 8_675_309;

/**
 * Save
 * @param name
 * @returns
 */

export async function createMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
     `);
}

/**
 *
 * @param name
 * @returns
 */
export async function hasMigrationTableExist(
  client: PoolClient,
  name: string
): Promise<boolean> {
  try {
    const res = await client.query(
      `SELECT id FROM migrations WHERE name = $1 `,
      [name]
    );

    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    logger.error(`[ Error ] Checking migrations table: `, err);
    return false;
  }
}

/**
 *
 * @param client
 * @param name
 */
export async function recordMigration(
  client: PoolClient,
  name: string
): Promise<void> {
  try {
    await client.query(`INSERT INTO migrations VALUES ($1)`, [name]);
  } catch (err) {
    logger.error(`[ Error ] Inserting Migrations Table`, err);
  }
}

/**
 *
 * @param client
 * @param name
 */
export async function removeMigration(
  client: PoolClient,
  name: string
): Promise<boolean> {
  try {
    const res = await client.query(`DELETE FROM migrations WHERE name = $1`, [
      name,
    ]);

    logger.info(`✅ Migration record ${name} deleted successfully`);

    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    logger.error(`Error deleting migration record: `, err);
    return false;
  }
}

/**
 *
 * @returns
 */
export async function appliedMigration(): Promise<string[]> {
  const client = await pool.connect();

  try {
    await createMigrationsTable(client);

    const { rows } = await pool.query<{ name: string }>(
      `SELECT name FROM migrations ORDER BY name`
    );

    return rows.map((row) => row.name);
  } finally {
    client.release();
  }
}

/**
 *
 * @returns
 */
export async function migrationStatus(): Promise<
  { name: string; applied: boolean }[]
> {
  const applied = new Set(await appliedMigration());
  return orderedMigrations().map(([name]) => ({
    name,
    applied: applied.has(name),
  }));
}

/**
 *
 * @param work
 * @returns
 */
export async function withMigrationLock<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    logger.info(`Waiting for the migration lock...`);

    await client.query(`SELECT pg_advisory_lock($1)`, [MIGRATION_LOCK_ID]);

    await createMigrationsTable(client);

    return await work(client);
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    } catch (err) {
      logger.warn(`[ Error ] Could not release the migration lock`, { err });
      client.release();
    }
  }
}

/**
 *
 * @param client
 * @param work
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

/**
 *
 */
export async function runMigration(): Promise<void> {
  await withMigrationLock(async (client) => {
    try {
      logger.info(`Starting database migrations...`);

      // Create migration table if not exist

      let applied: number = 0;

      for (const [name, migration] of orderedMigrations()) {
        const isExecuted = await hasMigrationTableExist(client, name);

        if (!isExecuted) {
          logger.debug(`[ Debug ] Not Applied, Skipping rollback: ${name}`);
          continue;
        }

        logger.info(`Rolling back migration: ${name}`);

        try {
          await inTransaction(client, async (tx) => {
            await migration.up(tx);
            await recordMigration(tx, name);
          });
        } catch (err) {
          logger.error(`Migration failed, rolled back: ${name}`, {
            err,
            migration: name,
          });

          throw err;
        }

        applied += 1;
      }

      logger.info(
        applied === 0
          ? '✅ Database already up to date'
          : `✅ Applied ${applied} migration(s)`
      );
    } catch (err) {
      logger.error(`[ Error ] Running Unknown Migrations`, err);
    }
  });
}

/**
 *
 */
export async function rollbackMigration(steps?: number): Promise<void> {
  await withMigrationLock(async (client) => {
    const pending = orderedMigrations().reverse();

    const limit = steps ?? pending.length;

    try {
      logger.info('Rolling back migrations...');

      let rollBack: number = 0;

      for (const [name, migration] of pending) {
        if (rollBack >= limit) break;

        if (!(await hasMigrationTableExist(client, name))) {
          logger.debug(`Not applied! skipping rollback: ${name}`);
          continue;
        }

        logger.info(`Rolling back migraions: ${name}`);

        try {
          await inTransaction(client, async (tx) => {
            await migration.down(tx);
            await removeMigration(tx, name);
          });
        } catch (err) {}
      }
    } catch (err) {
      logger.error(`Error: `, err);
      throw err;
    }
  });
}

/**
 *
 */
export async function resetDatabase(): Promise<void> {
  try {
    logger.info(`Resetting the database...`);

    // await rollbackMigration();

    await runMigration();

    logger.info(`✅ Database reset successfully`);
  } catch (err) {
    logger.error(`[ Error ] resetting database: `, err);
  }
}

/**
 * Drop list of migrations
 *
 */
export async function dropAllMigrations(): Promise<void> {
  try {
    logger.info(`✅ Database delete successfully`);
    await pool.query(`
        DROP TABLE IF EXISTS sessions CASCADE;
        DROP TABLE IF EXISTS migrations CASCADE;
        DROP TABLE IF EXISTS users CASCADE;

        DROP TYPE IF EXISTS user_role;
        DROP TYPE IF EXISTS auth_provider;
    `);
  } catch (err) {
    logger.error('Error dropping tables:', err);
  }
}
