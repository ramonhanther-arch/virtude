import "server-only";
import { rows } from "./db";

export const analyticsEvents = ["signup", "onboarding_complete", "mission_view", "checkin_complete", "mentor_message", "day7_return"] as const;
export type AnalyticsEvent = (typeof analyticsEvents)[number];

const propertyKeys = ["focus", "day", "status", "variant", "plan"] as const;

export function sanitizeAnalyticsProperties(input: Record<string, unknown> | undefined) {
  const output: Record<string, string | number> = {};
  if (!input) return output;
  for (const key of propertyKeys) {
    const value = input[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 21) output[key] = value;
    else if (typeof value === "string" && /^[a-z0-9_]{1,32}$/.test(value)) output[key] = value;
  }
  return output;
}

export function isDay7Return(createdAt: string | undefined, now = new Date()) {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return now.getTime() - created.getTime() >= 7 * 24 * 60 * 60 * 1000;
}

export async function recordAnalytics(userId: string, event: Exclude<AnalyticsEvent, "signup">, properties?: Record<string, unknown>) {
  try {
    await rows(
      `insert into public.analytics_events (user_id, event, properties) values ($1::uuid, $2, $3::jsonb)`,
      [userId, event, JSON.stringify(sanitizeAnalyticsProperties(properties))],
    );
  } catch {
    return;
  }
}
