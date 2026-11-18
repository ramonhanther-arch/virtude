import { describe, expect, it } from "vitest";
import { isDay7Return, sanitizeAnalyticsProperties } from "./analytics";

describe("métricas sem PII", () => {
  it("mantém só códigos curtos", () => {
    expect(sanitizeAnalyticsProperties({
      focus: "spiritual_life", day: 3, status: "completed", variant: "simplified", plan: "free",
      email: "a@example.test", reflection: "texto íntimo", goal: "segredo",
    })).toEqual({ focus: "spiritual_life", day: 3, status: "completed", variant: "simplified", plan: "free" });
  });

  it("marca retorno no sétimo dia e ignora data inválida", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    expect(isDay7Return("2026-11-05T12:00:00Z", now)).toBe(true);
    expect(isDay7Return("2026-11-06T12:00:00Z", now)).toBe(false);
    expect(isDay7Return("não-data", now)).toBe(false);
  });
});
