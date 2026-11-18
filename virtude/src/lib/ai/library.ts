import "server-only";
import type { Focus, Mission } from "@/lib/types";
import { missions } from "@/content/missions";
import { rows } from "@/lib/server/db";

export async function loadMentorLibrary(): Promise<Mission[]> {
  const data = await rows<{
    id: string; focus: string; day: number; phase: string; title: string; reference: string; context: string;
    principle: string; practice: string; simplified: string; deepened: string; reflection_question: string;
  }>(
    `select id, focus, day, phase, title, reference, context, principle, practice, simplified, deepened, reflection_question
     from public.mission_templates where review_status = 'approved' order by focus, day limit 100`,
  );
  const approved: Mission[] = data.map((entry) => ({
    id: entry.id, focus: entry.focus as Focus, day: entry.day, phase: entry.phase, title: entry.title,
    reference: entry.reference, context: entry.context, principle: entry.principle, practice: entry.practice,
    simplified: entry.simplified, deepened: entry.deepened, reflectionQuestion: entry.reflection_question, reviewStatus: "approved",
  }));
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_UNREVIEWED_CONTENT === "true") {
    const keys = new Set(approved.map((entry) => `${entry.focus}:${entry.day}`));
    return [...approved, ...missions.filter((entry) => !keys.has(`${entry.focus}:${entry.day}`))];
  }
  return approved;
}
