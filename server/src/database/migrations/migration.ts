/**
 * @copyright 2026 - present, Heniseeyou ,LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import pool from '@/database/db';
import logger from '@/utils/logger.utils';

import * as migrtn001 from '@/database/migrations/controllers/002_migration_table.controller';

// Migration list
const migrations = {
  '001_migration_table': migrtn001,
};

/**
 * Save
 * @param name
 * @returns
 */

export async function createMigrationsTable(): Promise<void> {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
  } catch (err) {
    logger.error(`[ Error ] Creating database `, err);
  }
}

export async function isMigrationTableExist(name: string): Promise<boolean> {
  try {
    const res = await pool.query(`SELECT id FROM migrations WHERE name = $1 `, [
      name,
    ]);

    return res.rowCount! > 0;
  } catch (err) {
    logger.error(`[ Error ] Checking migrations table: `, err);
    return false;
  }
}

/**
 *
 * @param name
 */
export async function recordMigration(name: string): Promise<void> {
  try {
    const res = await pool.query(`INSERT`);
  } catch (err) {
    logger.error(``, err);
  }
}

/**
 *
 * @param name
 */
export async function removeMigration(name: string): Promise<void> {
  try {
    const res = await pool.query(`DELETE FROM migrations WHERE name=$1`, [
      name,
    ]);

    logger.info(`✅ Migration record ${name} deleted successfully`);
  } catch (err) {
    logger.error(`Error deleting migration record: `, err);
  }
}

/**
 *
 */
export async function runMigration(): Promise<void> {
  try {
    logger.info(`Starting database migrations...`);

    // Create migration table if not exist

    let count = 0;

    for (const [name, migration] of Object.entries(migrations).reverse()) {
      const isExecuted = await isMigrationTableExist(name);

      if (!isExecuted) {
        logger.debug(`[ Debug ] Not Applied, Skipping rollback: ${name}`);
        continue;
      }

      logger.info(`Rolling back migration: ${name}`);

      //   await migration.down(pool);
    }

    logger.info(`✅ All migrations rolled back successfully`);
  } catch (err) {
    logger.error(`Error :`, err);
  }
}

/**
 *
 */
export async function rollbackMigration(): Promise<void> {
  try {
    logger.info('Rolling back migrations...');
  } catch (err) {
    logger.error(`Error: `, err);
    throw err;
  }
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
