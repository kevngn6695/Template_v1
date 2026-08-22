/**
 * 
 */
import dotenv from "dotenv";
import { Pool, QueryResultRow, QueryResult } from "pg";

/**
 * 
 */
import logger from "@/utils/logger.utils";
import env from "@/config/env.config";

// 
dotenv.config({ quiet: true, debug: true });

const pool = new Pool({
  host: env.DB_HOST || "localhost",
  port: env.DB_PORT || 5432,
  user: env.DB_USER || "kevroo",
  database: env.DB_NAME || "kevroo",
  password: env.DB_PASSWORD || "kevngn0606!",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

try {
  pool.on("connect", () => {
    logger.info(
      `✅ Connected to ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME} database successfully`,
    );
  });
} catch (error) {
  pool.on("error", (err) => {
    logger.error("❌ Error connecting to the database", err.message);
  });
}

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  param?: any[],
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, param);
    const duration = Date.now() - start;
    logger.debug(
      "Executed query: ",
      { text, duration, rows: res.rowCount },
      "Query executed",
    );
    return res;
  } catch (error) {
    logger.error("Query error: ", { query: text, param, error });
    throw error;
  }
};

export const connectDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  logger.info(
    `✅ PostgresSQL connected: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
  );
  client.release();
};

export default pool;
