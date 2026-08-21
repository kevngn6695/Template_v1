import pool from "@/database/db";
import logger from "@/utils/logger.utils";

import {
  runMigration,
  resetDatabase,
  rollbackMigration,
} from "@/database/migrations/migration";

// Get the command
const arg = process.argv.slice(2);
const command = arg[0] || "up";

async function main() {
  try {
    switch (command) {
      case "up":
        logger.info(`Running migration...`);
        await runMigration();
        break;
      case "down":
        logger.info(`Rolling back last migration...`);
        await rollbackMigration();
        break;
      case "fresh":
        logger.info(`Resetting Database...`);
        await resetDatabase();
        break;
    }
  } catch (err) {
    logger.error(`[ Error ] Unknown command. Use 'up', 'down' or 'reset' `, {
      err,
    });
    process.exit(1);
  } finally {
    await pool.end();
    logger.info("Database connection closed");
  }
}

main();
