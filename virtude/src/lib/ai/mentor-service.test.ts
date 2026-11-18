import { afterEach, describe, expect, it, vi } from "vitest";
import { generateMentorReply } from "./mentor-service";
import type { AppState } from "@/lib/types";

const state: AppState = {
  profile: { displayName: "Pessoa", preferredTime: "08:00", locale: "pt-BR", reminderEmail: false }, consents: { sensitiveData: true, ai: true, history: false, journeyContext: false }, reviewer: false, journey: null, today: null,
  checkins: [], activities: [], conversations: [], plan: { code: "free", mentorDailyLimit: 5 }, contentPendingReview: true,
};
afterEach(() => vi.unstubAllEnvs());
describe("fronteira com provedor IA", () => {
  it("falha fechado sem configuração e não faz chamada", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetcher = vi.fn();
    await expect(generateMentorReply({ message: "Oi", mode: "reflection" }, state, [], fetcher)).rejects.toMatchObject({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("oculta corpo de erro do provedor e chaves", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    const fetcher = vi.fn().mockResolvedValue(new Response("sensitive internal provider failure", { status: 500 }));
    await expect(generateMentorReply({ message: "Relato privado", mode: "reflection" }, state, [], fetcher)).rejects.toMatchObject({ status: 502, message: "O Mentor não conseguiu responder agora. Tente novamente em alguns instantes." });
  });
  it("rejeita saída incompleta em vez de apresentar resposta parcial", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ status: "incomplete", output: [] }));
    await expect(generateMentorReply({ message: "Oi", mode: "reflection" }, state, [], fetcher)).rejects.toMatchObject({ status: 502 });
  });
  it("valida resposta concluída e minimiza payload enviado", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    const answer = { reply: "O que aconteceu nessa conversa?", references: [], questions: ["Qual foi sua reação?"], suggestedActivity: null, safety: "standard" };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(answer) }] }] }));
    await expect(generateMentorReply({ message: "Discuti com alguém", mode: "reflection" }, state, [], fetcher)).resolves.toEqual(answer);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body.tools).toEqual([]);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.openai.com/v1/responses");
  });
});
