import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(here, "../../../.env") });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_TEXT_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_LIVE_MODEL: z.string().default("gemini-2.5-flash-native-audio-preview-12-2025"),
  GEMINI_OUTPUT_VOICE: z.string().default("Kore"),
  LOCAL_MODE: z
    .string()
    .optional()
    .default("")
    .transform((v) => v === "true"),
  DEMO_MODE: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true"),
});

export const env = EnvSchema.parse(process.env);

export function isDemoMode(): boolean {
  return env.DEMO_MODE && env.NODE_ENV !== "production";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Sin Supabase. La copia durable está en el navegador. */
export function isLocalMode(): boolean {
  return true;
}

export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY) || isDemoMode();
}
