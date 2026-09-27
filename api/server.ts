import type { Request, Response } from "express";
import type { createApp } from "../backend/src/app.js";

type App = ReturnType<typeof createApp>;

let appPromise: Promise<App> | null = null;

function getApp(): Promise<App> {
  if (!appPromise) {
    appPromise = import("../backend/src/app.js").then((mod) => mod.createApp());
  }
  return appPromise;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const app = await getApp();
  app(req, res);
}
