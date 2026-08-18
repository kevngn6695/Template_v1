/**
 * @copyright 2026 - present, Heniseeyou ,LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import logger from "@/utils/logger.utils";
import dotenv from "dotenv";
import z from "zod";

dotenv.config();

const env = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z.string().default("development"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  // Postgresql Database
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.string().transform(Number).default(5432),
  DB_NAME: z.string().default("auth_system"),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default("your_password_change_in_production"),

  //Security
  BCRYPT_ROUNDS: z.string().default("12"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000"), // 15 minutes,
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100"),

  // Session and Cookies
  SESSION_SECRET: z
    .string()
    .default("your_session_secret_change_in_production"),
  COOKIE_SECRET: z.string().default("your_cookie_secret_change_in_production"),
  COOKIE_DOMAIN: z.string().default("localhost"),
});

const config = env.parse(process.env);

export default config;
