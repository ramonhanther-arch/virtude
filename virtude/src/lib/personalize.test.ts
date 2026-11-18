import { describe, expect, it } from "vitest";
import { buildPersonalizationPayload, fallbackPersonalization, purposeLink, validatePersonalization } from "./personalize";

const base = "Escolha uma reação recente e descreva o que aconteceu, sem se insultar e sem registrar nomes de outras pessoas.";
const clean = {
  title: "Pausa antes da resposta",
  commitment: "Hoje eu espero uma frase inteira antes de responder.",
  practice: "Na próxima conversa sem urgência, deixe a outra pessoa terminar a frase e só então diga o que você precisa.",
};

describe("personalização da missão", () => {
  it("liga o catálogo ao propósito sem fingir adaptação profunda", () => {
    const result = fallbackPersonalization({ goal: "Ouvir com calma", difficulty: "Respondo cedo demais" });
    expect(result.personalizationSource).toBe("fallback");
    expect(result.personalizedTitle).toBeNull();
    expect(result.personalizedPractice).toContain("sem adaptação profunda");
    expect(result.personalizedPractice).toContain("Ouvir com calma");
    expect(result.personalizedPractice).toContain("Respondo cedo demais");
    expect(result.personalizedPractice).not.toMatch(/Deus te disse|você será curado|prosperidade/i);
    expect(purposeLink("meta", "dificuldade")).toContain("catálogo");
  });

  it("aceita uma ação concreta e recusa referência, HTML, cura, riqueza e fala em nome de Deus", () => {
    expect(validatePersonalization(clean, "Tiago 1:19").personalizationSource).toBe("model");
    for (const practice of [
      "Deus te disse para calar agora e confiar nesta ordem.",
      "Você será curado se repetir esta prática até o fim.",
      "Esta prática garante prosperidade e ficar rico.",
      "<b>faça isso</b> sem pensar no contexto da conversa de hoje.",
      "Leia Tiago 1:19 de novo e responda com uma frase curta hoje.",
      clean.practice,
    ]) {
      const value = { ...clean, practice: practice === clean.practice ? "x".repeat(20) : practice };
      expect(() => validatePersonalization(value, "Tiago 1:19")).toThrow();
    }
    expect(() => validatePersonalization({ ...clean, reference: "Tiago 1:19" }, "Tiago 1:19")).toThrow();
  });

  it("envia a referência só como dado travado e não pede uma passagem nova", () => {
    const payload = buildPersonalizationPayload({ reference: "Tiago 1:19", basePractice: base, goal: "Ouvir", difficulty: "Interrompo", recentCheckins: [{ status: "attempted", learned: "Esperei uma frase." }] }, "test-model");
    const schema = payload.text.format.schema as { properties: Record<string, unknown> };
    expect(Object.keys(schema.properties).sort()).toEqual(["commitment", "practice", "title"]);
    const body = JSON.parse(payload.input[0].content) as { lockedReference: string; catalogAction: string };
    expect(body.lockedReference).toBe("Tiago 1:19");
    expect(body.catalogAction).toBe(base);
    expect(JSON.stringify(payload)).not.toContain("OPENAI_API_KEY");
    expect(payload.tools).toEqual([]);
  });
});
