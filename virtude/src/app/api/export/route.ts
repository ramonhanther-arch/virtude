import { requireSession } from "@/lib/server/context";
import { rows } from "@/lib/server/db";
import { handleRoute, json } from "@/lib/server/http";
import { consumeLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const tables = ["profiles", "consents", "personal_goals", "journeys", "mission_assignments", "check_ins", "mentor_conversations", "mentor_messages", "activities", "subscriptions", "product_events", "analytics_events"] as const;

export async function GET() { return handleRoute(async () => {
  const { user } = await requireSession();
  await consumeLimit(user.id, "export", 3, 3600);
  const exported: Record<string, unknown> = {};
  for (const table of tables) {
    exported[table] = await rows(`select * from public.${table} where user_id = $1 order by id`, [user.id]);
  }
  const checkins = exported.check_ins as { id: string; assignment_id: string; reflection: string | null; learned: string | null }[];
  exported.reflections = checkins.map((item) => ({ checkInId: item.id, assignmentId: item.assignment_id, reflection: item.reflection, learned: item.learned }));
  const response = json({ version: 1, exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email, createdAt: user.createdAt }, data: exported });
  response.headers.set("Content-Disposition", 'attachment; filename="virtude-dados.json"');
  return response;
}); }
