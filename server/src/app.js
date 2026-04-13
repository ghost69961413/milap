import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import env from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import routes from "./routes/index.js";

const app = express();
app.set("etag", false);

if (env.nodeEnv === "production") {
  // Render/Cloudflare sits in front of Express, so trust proxy is required
  // for correct client IP detection (especially for rate limiting).
  app.set("trust proxy", 1);
}

function resolveGlobalRateLimit() {
  const configuredLimit = Number(process.env.GLOBAL_RATE_LIMIT_MAX);

  if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
    return configuredLimit;
  }

  return env.nodeEnv === "production" ? 1500 : 5000;
}

function buildCorsOriginValidator() {
  if (env.nodeEnv === "production") {
    return env.clientUrl;
  }

  const localOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
  const allowedOrigins = new Set(
    [env.clientUrl, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean)
  );

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin) || localOriginRegex.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  };
}

app.use(
  cors({
    origin: buildCorsOriginValidator(),
    credentials: true
  })
);
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: resolveGlobalRateLimit(),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.method === "OPTIONS" || req.path === "/api/v1/health",
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        success: false,
        statusCode: options.statusCode,
        message: "Too many requests. Please wait a moment and try again."
      });
    }
  })
);
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Milap Matrimony API is live"
  });
});

app.use("/api/v1", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
