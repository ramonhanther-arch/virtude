import "server-only";
import type { z } from "zod";
import type { Focus } from "@/lib/types";
import { recordAnalytics } from "./analytics";
import { assertMissionAvailable } from "./context";
import { call, rows } from "./db";
import type { onboardingSchema, checkinSchema, journeySchema, settingsSchema } from "./schemas";

export async function onboard(userId: string, input: z.infer<typeof onboardingSchema>) {
  await assertMissionAvailable(input.focus, 1);
  await call("complete_onboarding", [userId, input.displayName, input.focus, input.difficulty, input.goal, input.preferredTime, input.aiConsent, input.historyConsent, input.journeyContextConsent]);
  if (input.reminderEmail) await call("set_reminder_email", [userId, true]);
  await recordAnalytics(userId, "onboarding_complete", { focus: input.focus });
}

export async function saveCheckin(userId: string, input: z.infer<typeof checkinSchema>) {
  const assignment = await rows<{ focus: string; day: number }>(`select focus, day from public.mission_assignments where id = $1 and user_id = $2`, [input.assignmentId, userId]);
  if (assignment[0]) await assertMissionAvailable(assignment[0].focus as Focus, assignment[0].day);
  await call("save_checkin", [userId, input.assignmentId, input.status, input.reflection || null, input.learned || null]);
  await recordAnalytics(userId, "checkin_complete", { status: input.status, ...(assignment[0] ? { focus: assignment[0].focus, day: assignment[0].day } : {}) });
}

export async function changeJourney(userId: string, input: z.infer<typeof journeySchema>) {
  const journey = await rows<{ focus: string; current_day: number }>(
    `select focus, current_day from public.journeys where user_id = $1 and status in ('active','completed') order by created_at desc limit 1`,
    [userId],
  );
  if (journey[0]) {
    const focus = input.action === "switch" ? input.focus! : journey[0].focus as Focus;
    const day = input.action === "restart" || input.action === "switch" ? 1 : input.action === "advance" ? Math.min(21, journey[0].current_day + 1) : journey[0].current_day;
    await assertMissionAvailable(focus, day);
  }
  await call("change_journey", [userId, input.action, input.focus ?? null]);
}

export async function updateSettings(userId: string, input: z.infer<typeof settingsSchema>) {
  await rows(`select public.update_settings($1::uuid, $2, $3, $4::jsonb)`, [userId, input.displayName ?? null, input.preferredTime ?? null, input.consents ? JSON.stringify(input.consents) : null]);
  if (typeof input.reminderEmail === "boolean") await call("set_reminder_email", [userId, input.reminderEmail]);
}
