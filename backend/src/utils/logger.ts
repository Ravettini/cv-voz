import { env } from "../config/env.js";

type Level = "info" | "warn" | "error";

const SENSITIVE = /api[_-]?key|token|password|authorization|jwt|service_role|secret/i;

function sanitize(value: unknown): unknown {
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : sanitize(v);
    }
    return out;
  }
  return value;
}

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta: sanitize(meta) } : {}),
  };
  if (env.NODE_ENV === "production" && meta?.transcript) {
    delete (payload.meta as Record<string, unknown>).transcript;
  }
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};
