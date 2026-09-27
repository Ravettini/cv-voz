import { describe, expect, it } from "vitest";
import { humanizeGeminiError } from "../src/middleware/errorHandler.js";

describe("humanizeGeminiError", () => {
  it("traduce errores técnicos a mensajes humanos", () => {
    expect(humanizeGeminiError(new Error("BidiGenerateContent websocket closed 1011"))).toMatch(/conexión/);
    expect(humanizeGeminiError(new Error("RESOURCE_EXHAUSTED quota"))).toMatch(/ocupado/);
    expect(humanizeGeminiError(new Error("API key missing"))).toMatch(/Gemini no está configurado/);
  });
});
