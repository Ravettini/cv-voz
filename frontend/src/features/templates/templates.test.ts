import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@cv-voz/shared";

describe("templates", () => {
  it("expone exactamente cuatro plantillas", () => {
    expect(TEMPLATES).toHaveLength(4);
    expect(TEMPLATES.map((t) => t.id)).toEqual(["ats", "professional", "modern", "executive"]);
  });
});
