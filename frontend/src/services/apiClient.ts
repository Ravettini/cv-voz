import { cacheHasData, readBrowserCache, rememberApiResult } from "@/lib/browserCache";
import { LOCAL_DEV_TOKEN } from "@/lib/localSession";

const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
const API_URL = fromEnv ? fromEnv : import.meta.env.DEV ? "http://localhost:3001" : "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${LOCAL_DEV_TOKEN}`);

  const method = (init.method ?? "GET").toUpperCase();
  let body = init.body;
  if (path !== "/api/dev/hydrate" && method !== "GET" && method !== "HEAD" && !(body instanceof FormData)) {
    const cache = readBrowserCache();
    if (cache) {
      try {
        const parsed =
          typeof body === "string" && body
            ? (JSON.parse(body) as Record<string, unknown>)
            : ({} as Record<string, unknown>);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsed._cache = cache;
          body = JSON.stringify(parsed);
          if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
        }
      } catch {
        /* Si el cuerpo no es JSON, el pedido sigue sin la copia del navegador. */
      }
    }
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, body });
  if (!res.ok) {
    let message = "Algo no salió como esperábamos. Probá de nuevo.";
    let code: string | undefined;
    try {
      const json = (await res.json()) as { error?: string; code?: string };
      message = json.error || message;
      code = json.code;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as T;
    rememberApiResult(path, init.method ?? "GET", data);
    return data;
  }
  return (await res.blob()) as T;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export async function getAuthToken(): Promise<string | undefined> {
  return LOCAL_DEV_TOKEN;
}

let hydrated = false;

/** Restaura la memoria del servidor con lo guardado en este navegador. */
export async function hydrateServerFromBrowser(): Promise<void> {
  if (hydrated) return;
  const cache = readBrowserCache();
  if (!cacheHasData(cache) || !cache) {
    hydrated = true;
    return;
  }
  await apiFetch("/api/dev/hydrate", {
    method: "POST",
    body: JSON.stringify(cache),
  });
  hydrated = true;
}
