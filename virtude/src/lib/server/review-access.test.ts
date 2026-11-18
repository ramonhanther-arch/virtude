import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewDecisionSchema } from "./schemas";
import { isContentReviewer } from "./review-access";

afterEach(() => vi.unstubAllEnvs());

describe("acesso à revisão", () => {
  it("aceita e-mail da lista e papel admin do servidor, nunca metadado solto", () => {
    vi.stubEnv("VIRTUDE_CONTENT_REVIEWERS", " Editor@Igreja.org , outra@example.test ");
    expect(isContentReviewer("editor@igreja.org", {})).toBe(true);
    expect(isContentReviewer("alguem@example.test", { role: "admin" })).toBe(true);
    expect(isContentReviewer("alguem@example.test", { role: "user" })).toBe(false);
    expect(isContentReviewer(undefined, {})).toBe(false);
  });

  it("não aprova por omissão e exige nota para ajuste ou rejeição", () => {
    expect(reviewDecisionSchema.safeParse({ focus: "spiritual_life", day: 1, decision: "approved", note: "" }).success).toBe(true);
    expect(reviewDecisionSchema.safeParse({ focus: "spiritual_life", day: 1, decision: "needs_changes", note: "curto" }).success).toBe(false);
    expect(reviewDecisionSchema.safeParse({ focus: "spiritual_life", day: 1, note: "sem decisão humana" }).success).toBe(false);
    expect(reviewDecisionSchema.safeParse({ focus: "spiritual_life", day: 1, decision: "approved", note: "", reviewStatus: "approved" }).success).toBe(false);
  });
});
