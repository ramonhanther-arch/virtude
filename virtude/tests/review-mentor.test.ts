import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/server/http";
import { validateMentorOutput } from "@/lib/ai/mentor-core";
import type { AppState } from "@/lib/types";

const mocks = vi.hoisted(() => ({ context: vi.fn(), limit: vi.fn(), generate: vi.fn(), library: vi.fn() }));
vi.mock("@/lib/server/context", () => ({ requireContext: mocks.context }));
vi.mock("@/lib/server/rate-limit", () => ({ consumeLimit: mocks.limit }));
vi.mock("@/lib/ai/mentor-service", () => ({ generateMentorReply: mocks.generate }));
vi.mock("@/lib/ai/library", () => ({ loadMentorLibrary: mocks.library }));
import { POST } from "@/app/api/mentor/route";
const state: AppState = { profile: { displayName: "Review", preferredTime: "08:00", locale: "pt-BR", reminderEmail: false }, consents: { sensitiveData: true, ai: true, history: false, journeyContext: false }, reviewer: false, journey: null, today: null, checkins: [], activities: [], conversations: [], plan: { code: "free", mentorDailyLimit: 5 }, contentPendingReview: true };
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://virtude.example"); mocks.context.mockResolvedValue({ supabase: {}, user: { id: "A" }, state }); });
afterEach(() => vi.unstubAllEnvs());
describe("independent Mentor boundary counterexamples", () => {
  it("returns local urgent support before quotas, history, library or provider", async () => {
    mocks.limit.mockRejectedValue(new ApiError(429, "Limite atingido."));
    const rpc = vi.fn().mockResolvedValue({ error: { code: "42501" } });
    mocks.context.mockResolvedValue({ supabase: { rpc }, user: { id: "A" }, state: { ...state, consents: { ...state.consents, history: true } } });
    const response = await POST(new Request("https://virtude.example/api/mentor", { method: "POST", headers: { origin: "https://virtude.example", "content-type": "application/json" }, body: JSON.stringify({ message: "Quero me matar" }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ safety: "urgent", conversationId: null, suggestedActivity: null, reply: expect.stringMatching(/192.*188/s) });
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.library).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["João 99:99", "Jo 99:99", "JOÃO 99:99", "Mateus99:99", "2 Coríntios 99:99", "João\u00a099:99", "Joa\u0303o 99:99"])("rejects unauthorized citation %s throughout response fields", citation => {
    const output = { reply: "Uma reflexão cotidiana.", references: [], questions: [], suggestedActivity: null, safety: "standard" };
    for (const candidate of [
      { ...output, reply: `${citation} ensina este princípio.` },
      { ...output, questions: [`Como aplicar ${citation}?`] },
      { ...output, suggestedActivity: { title: citation, description: "Uma prática pequena." } },
      { ...output, suggestedActivity: { title: "Prática", description: `Aplique ${citation}.` } },
    ]) expect(() => validateMentorOutput(candidate, new Set(["Tiago 1:19"]), "reflection")).toThrow();
  });
});
