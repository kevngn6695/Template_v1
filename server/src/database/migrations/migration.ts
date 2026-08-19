import pool from "@/database/db";
import logger from "@/utils/logger.utils";

import * as migrtn001 from "@/database/migrations/controllers/001_greeting_table.controller";

// Migration list
const migrations = {
  "001_greeting_table": migrtn001,
};

/**
 *
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

export const recordMigration = async (name: string): Promise<void> => {
  try {
    const res = await pool.query(``);
  } catch (err) {
    logger.error(``, err);
  }
};
