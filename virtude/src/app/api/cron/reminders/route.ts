import { rows } from "@/lib/server/db";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { reminderSummary, type ReminderCandidate } from "@/lib/server/reminders";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16 || request.headers.get("authorization") !== `Bearer ${secret}`) throw new ApiError(401, "Não autorizado.", "UNAUTHENTICATED");
    const data = await rows<{ user_id: string; preferred_time: string }>(
      `select user_id, preferred_time::text as preferred_time from public.profiles where reminder_email`,
    );
    const candidates: ReminderCandidate[] = data.map((row) => ({ userId: row.user_id, preferredTime: String(row.preferred_time).slice(0, 5) }));
    const summary = reminderSummary(candidates);
    return json({ eligible: summary.eligible, due: summary.due, sent: summary.sent, channel: summary.channel, provider: summary.provider });
  });
}
