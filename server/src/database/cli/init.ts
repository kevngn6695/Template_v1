/**
 * @copyright 2026 - present, Heniseeyou ,LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import pool from '@/database/db';
import logger from '@/utils/logger.utils';

import {
  runMigration,
  resetDatabase,
  rollbackMigration,
} from '@/database/migrations/migration';

const COMMANDS = ['up', 'down', 'fresh', 'drop', 'status'];

// Get the command
const arg = process.argv.slice(2);
const command = arg[0] || 'up';

/**
 *
 */
export type Command = (typeof COMMANDS)[number];

/**
 * Narrow an arbitrary argv string to a known command.
 *
 * @param val value raw argv entry
 * @returns whether it is one of COMMANDS
 */
const isCommand = (val: string | undefined): val is Command =>
  COMMANDS.includes(val as Command);

/**
 * Main Function
 */
async function main(): Promise<void> {
  if (!isCommand(command)) {
    logger.error(
      `[Error] Unknown Command "${command}". Use one of ${COMMANDS.join(', ')}`
    );

    process.exitCode = 2;
    return;
  }

  // [ Edit ] add more cases
  try {
    switch (command) {
      case 'up':
        logger.info(`Running migration...`);
        await runMigration();
        break;

      case 'down':
        // Rolls back ONE step unless told otherwise — an accidental extra
        // keystroke should not cost the whole schema:  npm run db:down --
        const steps = Number.parseInt(arg[1] ?? '1', 10);

        logger.info(`Rolling back last migration...`);
        await rollbackMigration();
        break;
      case 'fresh':
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
    logger.info('Database connection closed');
  }
}

main();
