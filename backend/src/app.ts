import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { health } from "./controllers/healthController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { aiRouter } from "./routes/ai.js";
import { candidateProfileRouter } from "./routes/candidateProfile.js";
import { interviewsRouter } from "./routes/interviews.js";
import { photosRouter } from "./routes/photos.js";
import { resumesRouter } from "./routes/resumes.js";
import { devRouter } from "./routes/dev.js";
import { isLocalMode } from "./config/env.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "8mb" }));
  app.use(generalLimiter);

  app.get("/api/health", health);
  app.use("/api/ai", aiRouter);
  app.use("/api/interviews", interviewsRouter);
  app.use("/api/candidate-profile", candidateProfileRouter);
  app.use("/api/profile/photo", photosRouter);
  app.use("/api/resumes", resumesRouter);
  if (isLocalMode()) {
    app.use("/api/dev", devRouter);
  }

  if (process.env.VERCEL) {
    const dist = path.resolve(process.cwd(), "frontend/dist");
    app.use(express.static(dist));
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.join(dist, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(errorHandler);
  return app;
}
