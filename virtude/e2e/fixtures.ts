import { expect, type Page } from "@playwright/test";
import { getMission } from "../src/content/missions";
import { fallbackPersonalization } from "../src/lib/personalize";
import type { AppState, Focus, MentorReply, PracticeStatus } from "../src/lib/types";

export const conversationId = "10000000-0000-4000-8000-000000000003";
const createdAt = "2026-10-27T12:00:00.000Z";

export function sampleState(): AppState {
  const mission = getMission("self_control", 1);
  if (!mission) throw new Error("Missing day 1 catalogue mission");
  return {
    profile: { displayName: "Pessoa de teste", preferredTime: "08:00", locale: "pt-BR", reminderEmail: false },
    reviewer: false,
    consents: { sensitiveData: true, ai: false, history: false, journeyContext: false },
    journey: { id: "10000000-0000-4000-8000-000000000001", focus: "self_control", currentDay: 1, status: "active", difficulty: "Pequeno", goal: "Ouvir com calma" },
    today: { ...mission, assignmentId: "10000000-0000-4000-8000-000000000002", variant: "standard", ...fallbackPersonalization({ goal: "Ouvir com calma", difficulty: "Pequeno" }) },
    checkins: [], activities: [], conversations: [],
    plan: { code: "free", mentorDailyLimit: 5 }, contentPendingReview: true,
  };
}

type Call = { path: string; method: string; body: Record<string, unknown> | null; search: string };
export async function mockAccount(page: Page, initial = sampleState()) {
  const model = {
    state: structuredClone(initial), calls: [] as Call[], unexpected: [] as string[],
    failures: {} as Record<string, { status: number; error: string; code?: string }>,
    reply: {
      reply: "Vamos distinguir o fato da interpretação, com uma pausa antes de responder.",
      references: ["Tiago 1:19"], questions: ["Qual foi o fato que você observou?"],
      suggestedActivity: { title: "Ouvir antes de responder", description: "Faça uma pausa e ouça uma frase inteira." },
      conversationId, safety: "normal",
    } as MentorReply,
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : null;
    model.calls.push({ path, method, body, search: url.search });
    const json = (data: unknown, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", headers: { "Cache-Control": "no-store", ...headers }, body: JSON.stringify(data) });
    const failure = model.failures[path];
    if (failure) return json({ error: failure.error, code: failure.code }, failure.status);
    if (path === "/api/state" && method === "GET") return json(model.state);
    if (path === "/api/checkins" && method === "POST" && body) {
      model.state.checkins = [{ id: "synthetic-checkin", assignmentId: String(body.assignmentId), day: model.state.today!.day, status: body.status as PracticeStatus, reflection: String(body.reflection), learned: body.learned ? String(body.learned) : null, createdAt }];
      return json({ ok: true });
    }
    if (path === "/api/journey" && method === "POST" && body) {
      if (body.action === "adapt") model.state.today!.variant = "simplified";
      if (body.action === "advance") {
        const day = model.state.journey!.currentDay + 1;
        model.state.journey!.currentDay = day;
        model.state.today = { ...getMission(model.state.journey!.focus, day)!, assignmentId: `synthetic-day-${day}`, variant: "standard", ...fallbackPersonalization({ goal: model.state.journey!.goal, difficulty: model.state.journey!.difficulty }) };
      }
      if (body.action === "restart" || body.action === "switch") {
        const focus = body.focus as Focus | undefined;
        model.state.journey!.focus = focus ?? model.state.journey!.focus;
        model.state.journey!.currentDay = 1;
        model.state.today = { ...getMission(model.state.journey!.focus, 1)!, assignmentId: "synthetic-restart", variant: "standard", ...fallbackPersonalization({ goal: model.state.journey!.goal, difficulty: model.state.journey!.difficulty }) };
        model.state.checkins = [];
      }
      return json({ ok: true });
    }
    if (path === "/api/settings" && method === "PATCH" && body) {
      if (typeof body.displayName === "string") model.state.profile.displayName = body.displayName;
      if (typeof body.preferredTime === "string") model.state.profile.preferredTime = body.preferredTime;
      if (typeof body.reminderEmail === "boolean") model.state.profile.reminderEmail = body.reminderEmail;
      Object.assign(model.state.consents, body.consents);
      if (!model.state.consents.history) model.state.conversations = [];
      return json({ ok: true });
    }
    if (path === "/api/goal" && method === "PATCH" && body) {
      model.state.journey!.goal = String(body.goal);
      model.state.journey!.difficulty = String(body.difficulty);
      return json({ ok: true });
    }
    if (path === "/api/mentor" && method === "GET") return json({ messages: [{ role: "user", content: "Relato sintético salvo" }, { role: "assistant", content: "Resposta sintética salva" }] });
    if (path === "/api/mentor" && method === "POST") return json(model.reply);
    if (path === "/api/activities" && method === "POST" && body) {
      model.state.activities.push({ id: "synthetic-activity", title: String(body.title), description: String(body.description), createdAt });
      return json({ ok: true });
    }
    if (path === "/api/evolution" && method === "GET") return json({ journeys: model.state.journey ? [{ ...model.state.journey, createdAt, records: model.state.checkins }] : [] });
    if (path === "/api/onboarding" && method === "POST" && body) {
      model.state = sampleState();
      model.state.profile.displayName = String(body.displayName);
      return json({ ok: true });
    }
    if (path === "/api/export" && method === "GET") return json({ synthetic: true, state: model.state }, 200, { "Content-Disposition": 'attachment; filename="synthetic-virtude.json"' });
    if (path === "/api/account" && method === "DELETE") {
      model.failures["/api/state"] = { status: 401, error: "Sessão encerrada." };
      return json({ ok: true });
    }
    if (path === "/api/auth" && method === "POST") {
      if (body?.action === "login") delete model.failures["/api/state"];
      return json({ message: "Solicitação sintética recebida", redirectTo: "/app" });
    }
    model.unexpected.push(`${method} ${path}`);
    return json({ error: "No synthetic handler registered" }, 501);
  });
  return model;
}

export async function noHorizontalOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const size = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  expect(size.content, `content width ${size.content}; viewport ${size.width}`).toBeLessThanOrEqual(size.width + 1);
}
