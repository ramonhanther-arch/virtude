import { requireContext } from "@/lib/server/context";
import { rows } from "@/lib/server/db";
import { handleRoute, json } from "@/lib/server/http";
import { consumeLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export function GET() {
  return handleRoute(async () => {
    const { user } = await requireContext();
    await consumeLimit(user.id, "mentor_read", 60, 60);
    const journeys = await rows<{ id: string; focus: string; current_day: number; status: string; created_at: string }>(
      `select id, focus, current_day, status, created_at from public.journeys where user_id = $1 order by created_at desc limit 100`,
      [user.id],
    );
    const assignments = await rows<{ id: string; journey_id: string; day: number }>(
      `select id, journey_id, day from public.mission_assignments where user_id = $1 order by id`,
      [user.id],
    );
    const checkins = await rows<{ assignment_id: string; status: string; reflection: string | null; learned: string | null; created_at: string }>(
      `select assignment_id, status, reflection, learned, created_at from public.check_ins where user_id = $1 order by id`,
      [user.id],
    );
    return json({ journeys: journeys.map((journey) => {
      const ids = new Set(assignments.filter((assignment) => assignment.journey_id === journey.id).map((assignment) => assignment.id));
      const records = checkins.filter((checkin) => ids.has(checkin.assignment_id));
      return {
        id: journey.id, focus: journey.focus, currentDay: journey.current_day, status: journey.status, createdAt: journey.created_at,
        completed: records.filter((record) => record.status === "completed").length,
        attempted: records.filter((record) => record.status !== "skipped").length,
        reflections: records.filter((record) => record.reflection || record.learned).length,
        records: records.map((record) => ({ day: assignments.find((assignment) => assignment.id === record.assignment_id)?.day, status: record.status, reflection: record.reflection, learned: record.learned, createdAt: record.created_at })),
      };
    }) });
  });
}
