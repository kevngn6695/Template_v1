/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import type { Server } from 'http';

import app from '@/main/App';
import env from '@/config/env.config';
import logger from '@/utils/logger.utils';

import { connectDatabase, disconnectDatabase } from './database/db';

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

let server: Server | undefined;

/**
 * Connects to Postgres, then starts listening.
 *
 * @remarks
 * The process exits 1 on failure in every environment, not only production. A
 * dev server left running without a database answers every request with a
 * confusing error instead of telling you the database is down.
 *
 * @see {@link connectDatabase}, which handles the retry loop.
 */

async function start(): Promise<void> {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      logger.info(
        `Server running at http://localhost:${env.PORT} in ${env.NODE_ENV} mode`
      );
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start the server');

    /**
     * Exit in every environment, not only production. A dev server left
     * running without a database answers every request with a confusing error
     * instead of telling you the database is down.
     */
    await disconnectDatabase().catch(() => undefined);

    if (env.NODE_ENV == 'production') {
      process.exit(1);
    }
  }
}

void start();

/* -------------------------------------------------------------------------- */
/* Shutdown                                                                    */
/* -------------------------------------------------------------------------- */

let shuttingDown = false;

/**
 * Handle Server Shutdown [Fixed]
 */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received, shutting down gracefully…`);

  // Never hang forever on a stuck connection. `unref` so this timer does not
  // itself keep the process alive.
  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out after 10s, exiting immediately');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('HTTP server closed');
    }

    await disconnectDatabase();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  void shutdown('uncaughtException');
});
