import winston from "winston";
import path from "path";

const level = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Initialize color code for printed lines on console
const color = {
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "blue",
};

// Add initial color code
winston.addColors(color);

// [ File Format ]:
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.colorize(),
  winston.format.json(),
  winston.format.printf((info) => {
    return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
  }),
);

// [ Console Format ]:
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf((info, ...meta) => {
    return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
  }),
);

const loggerDirectory = path.join(__dirname, "../../logs");

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  level: process.env.LOG_LEVEL || "info",
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(loggerDirectory, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(loggerDirectory, "combined.log"),
      maxFiles: 5 * 1024 * 1024, // 5MB,
      maxsize: 5 * 1024 * 1024, // 5MB,
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

export default logger;
