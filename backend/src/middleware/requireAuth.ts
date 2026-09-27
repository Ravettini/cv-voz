import type { NextFunction, Request, Response } from "express";
import { LOCAL_DEV_TOKEN, LOCAL_USER_EMAIL, LOCAL_USER_ID } from "../services/localStore.js";
import { logger } from "../utils/logger.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Necesitás iniciar sesión para continuar.",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({
        error: "Necesitás iniciar sesión para continuar.",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    if (token !== LOCAL_DEV_TOKEN && token.length < 8) {
      res.status(401).json({
        error: "Tu sesión venció. Volvé a iniciar sesión.",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    req.user = { id: LOCAL_USER_ID, email: LOCAL_USER_EMAIL };
    next();
  } catch (err) {
    logger.error("Auth middleware failed", { message: err instanceof Error ? err.message : "unknown" });
    res.status(401).json({
      error: "No pudimos validar tu sesión.",
      code: "UNAUTHENTICATED",
    });
  }
}
