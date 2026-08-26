/**
 * @copyright 2026 - present, Heniseeyou ,LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import { PoolClient } from 'pg';

/**
 *
 * @param pool
 */
export const up = async (pool: PoolClient): Promise<void> => {
  // Fix this
  await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations {
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        }`);
};

/**
 *
 * @param pool
 */
export const down = async (pool: PoolClient): Promise<void> => {
  // Fix this
  await pool.query(`
            DROP TRIGGER IF EXISTS users_updated_at ON users;
            
        `);
};
