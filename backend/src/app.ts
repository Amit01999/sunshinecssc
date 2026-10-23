import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env";
import { apiRateLimiter } from "./middleware/rateLimiters";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import routes from "./routes";

export function createApp() {
  const app = express();

  // Vercel's edge adds exactly one X-Forwarded-For hop in front of the function. Trusting only
  // that one hop (not `true`/the whole chain) is what express-rate-limit requires too - `true`
  // would let a client forge its own leading XFF entries and spoof whatever IP it wants past the
  // real one Vercel appends, which express-rate-limit now refuses to run under for exactly that
  // reason (ERR_ERL_PERMISSIVE_TRUST_PROXY, confirmed by testing - `true` throws at request time).
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.frontendUrls.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? "combined" : "dev"));
  }

  app.use("/api", apiRateLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
