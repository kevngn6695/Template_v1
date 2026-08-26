/**
 * @copyright 2026 - present, Heniseeyou ,LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import { disconnectDatabase } from '@/database/db';
import logger from '@/utils/logger.utils';

import {
  MigrationLockError,
  serializeError,
} from '@/database/utils/errors.utils';

import {
  runMigration,
  migrationStatus,
  dropAllMigrations,
  resetDatabase,
  rollbackMigration,
} from '@/database/migrations/migration';

const COMMANDS = ['up', 'down', 'fresh', 'drop', 'status'];

// Get the command
const args = process.argv.slice(2);
const command = args[0] || 'up';

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
 *
 * @param raw
 * @returns
 */
function parseSteps(raw: string | undefined): number {
  if (raw === undefined) return 1;

  const steps: number = Number.parseInt(raw, 10);

  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error(`Expected a positive number of steps, got "${raw}"`);
  }

  return steps;
}

async function run(): Promise<void> {
  switch (command) {
    case 'up': {
      await runMigration();
      break;
    }

    case 'down': {
      // One step unless told otherwise — an accidental extra keystroke should
      // not cost the whole schema.
      const steps = parseSteps(args[1]);
      await rollbackMigration(steps);
      break;
    }

    case 'fresh': {
      await resetDatabase();
      break;
    }

    case 'drop': {
      await dropAllMigrations();
      break;
    }

    case 'status': {
      const rows = await migrationStatus();

      if (rows.length === 0) {
        logger.info('No migrations are registered');
        break;
      }

      for (const { name, applied } of rows) {
        logger.info(`${applied ? '✅ applied' : '⬜ pending'}  ${name}`);
      }

      const pending = rows.filter((row) => !row.applied).length;
      logger.info(
        pending === 0
          ? 'Database is up to date'
          : `${pending} migration(s) pending`
      );
      break;
    }

    default: {
      throw new Error(`Unhandled command: ${command}`);
    }
  }
}

async function main(): Promise<void> {
  if (!isCommand(command)) {
    logger.error(
      `Unknown command "${command}". Use one of: ${COMMANDS.join(', ')}`
    );
    process.exitCode = 2;
    return;
  }

  try {
    await run();
  } catch (err) {
    /**
     * `process.exitCode`, never `process.exit()`.
     *
     * `process.exit()` terminates immediately — the `finally` below would not
     * run, the pool would never close, and any buffered log lines would be
     * lost. Setting the code lets Node exit normally once cleanup is done, and
     * a non-zero exit is what makes this usable as a deploy step: a failed
     * migration stops the release instead of being a line in a log.
     */
    logger.error(`Migration command "${command}" failed`, {
      err: serializeError(err),
    });

    // 3 means "someone else is migrating" — a deploy script can retry that,
    // where a schema error (1) should stop the release.
    process.exitCode = err instanceof MigrationLockError ? 3 : 1;
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err: unknown) => {
  // Only reachable if cleanup itself throws.
  logger.error('Fatal error in the migration entry point', {
    err: serializeError(err),
  });
  process.exitCode = 1;
});
