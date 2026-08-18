import { rateLimit } from "express-rate-limit";
import env from "@/config/env.config";

const limiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS || "60"), // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: "draft-8", // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error:
      "You have sent too many requests in a given amount of time [15 minutes]. Please try again later.",
  },
});

export default limiter;
