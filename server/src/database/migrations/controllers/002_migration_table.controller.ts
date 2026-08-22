/** 
 * @copyright 2026 - present, Heniseeyou ,LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 * 
 */

import { Pool } from "pg";
import logger from "@/utils/logger.utils";

/**
 * 
 * @param pool 
 */
export const up = async (pool: Pool): Promise<void> => {
    try{
        // Fix this
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations {
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        }`);

        logger.info(`✅`);
    }catch(err){
        logger.error(`Error the database`,err);
    }
}

/**
 * 
 * @param pool 
 */
export const down = async (pool: Pool): Promise<void> =>{
    try {

        // Fix this
        await pool.query(`
            DROP TRIGGER IF EXISTS users_updated_at ON users;

        `);
        logger.info("✅ Migration table dropped successfully");
    } catch (err) {
        logger.error("Error dropping migration table:", err);
    }
}