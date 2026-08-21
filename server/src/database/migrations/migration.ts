import pool from "@/database/db";
import logger from "@/utils/logger.utils";

import * as migrtn001 from "@/database/migrations/controllers/001_greeting_table.controller";

// Migration list
const migrations = {
  "001_greeting_table": migrtn001,
};

/**
 * Save
 * @param name
 * @returns
 */
export const isMigrationTableExist = async (name: string): Promise<boolean> => {
  try {
    const res = await pool.query(`SELECT id FROM migrations WHERE name=$1 `, [
      name,
    ]);

    return res.rowCount! > 0;
  } catch (err) {
    logger.error(`Error checking migrations table: `, err);
    return false;
  }
};

/**
 *
 * @param name
 */
export const recordMigration = async (name: string): Promise<void> => {
  try {
    const res = await pool.query(`INSERT`);
  } catch (err) {
    logger.error(``, err);
  }
};

/**
 *
 * @param name
 */
export const removeMigration = async (name: string): Promise<void> => {
  try {
    const res = await pool.query(`DELETE FROM migrations WHERE name=$1`, [
      name,
    ]);

    logger.info(`✅ Migration record ${name} deleted successfully`);
  } catch (err) {
    logger.error(`Error deleting migration record: `, err);
  }
};

/**
 *
 */
export const runMigration = async (): Promise<void> => {
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
};

export const rollbackMigration = async (): Promise<void> => {
  try {
    logger.info("Rolling back migrations...");
  } catch (err) {
    logger.error(`Error: `, err);
    throw err;
  }
};

export const resetDatabase = async (): Promise<void> => {
  try {
    logger.info(`Resetting the database...`);

    // await rollbackMigration();

    await runMigration();

    logger.info(`✅ Database reset successfully`);
  } catch (err) {
    logger.error(`[ Error ] resetting database: `, err);
  }
};

export const dropAllMigrations = async (): Promise<void> => {
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
    logger.error("Error dropping tables:", err);
  }
};
