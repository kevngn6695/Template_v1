import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import compression from "compression";

import type { CorsOptions } from "cors";

import env from "@/config/env.config";
import limiter from "@/utils/rate_limit.utils";
import logger from "@/utils/logger.utils";
import pool from "@/database/db";

import apiRoute from "@/routes/index.routes";

dotenv.config({ debug: true, quiet: true });

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === "production",
    crossOriginEmbedderPolicy: false,
  }),
);

/**
 * Middleware configuration
 */

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        env.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
      ];
      if (
        env.NODE_ENV === "development" ||
        !origin ||
        allowed.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' is not allowed`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  } as CorsOptions),
);

(async () => {
  try {
    // Server connected
    await pool.connect();

    app.use("/api", apiRoute);
    /* Set a path between client and server */
    app.use(express.static(path.join(__dirname, "client/build")));

    app.get(/^\/(?!api).*/, (req, res) => {
      // Match all except /api routes
      res.sendFile(path.join(__dirname, "client/build/index.html"));
    });

    // Server configuration and middleware setup can be added here
    app.listen(env.PORT, () => {
      logger.info(
        `Server is running on port http://localhost:${env.PORT} in ${env.NODE_ENV} mode`,
      );
    });
  } catch (error) {
    logger.error(`Error occurred while starting the server: ${error}`);
    if (env.NODE_ENV == "production") {
      process.exit(1);
    }
  }
})();

const handleServerShutdown = async () => {
  try {
    // Server Connected
    await pool.end();
    logger.info("Shutting down server gracefully...");
  } catch (error) {
    logger.error("Error during server connection", error);
    process.exit(1);
  }
};

process.on("SIGNINT", handleServerShutdown);
process.on("SIGTERM", handleServerShutdown);
