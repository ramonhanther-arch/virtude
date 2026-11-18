import { afterEach, describe, expect, it, vi } from "vitest";
import { personalizePractice } from "./personalize-service";

const input = {
  reference: "Tiago 1:19",
  basePractice: "Ouça uma frase inteira antes de responder, sem interromper a pessoa.",
  goal: "Ouvir com calma",
  difficulty: "Eu respondo antes do fim da frase.",
};

afterEach(() => vi.unstubAllEnvs());

describe("serviço de personalização", () => {
  it("cai no catálogo com ligação explícita quando a IA não está configurada", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetcher = vi.fn();
    const result = await personalizePractice(input, fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.personalizationSource).toBe("fallback");
    expect(result.personalizedPractice).toContain("Ouvir com calma");
  });

  it("descarta saída insegura e devolve o fallback", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ title: "Ordem divina", commitment: "Obedeça sem perguntar hoje.", practice: "Deus te disse para calar e promete cura se você obedecer agora." }) }] }],
    }), { status: 200 }));
    const result = await personalizePractice(input, fetcher);
    expect(result.personalizationSource).toBe("fallback");
    expect(result.personalizedPractice).not.toMatch(/Deus te disse|cura/i);
  });
});
