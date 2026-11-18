import { z } from "zod";
import { requireSession } from "@/lib/server/context";
import { call } from "@/lib/server/db";
import { handleRoute, json, readJson } from "@/lib/server/http";

const goalSchema = z.object({ goal: z.string().trim().min(1).max(600), difficulty: z.string().trim().min(1).max(600) }).strict();

export function PATCH(request: Request) {
  return handleRoute(async () => {
    const input = await readJson(request, goalSchema);
    const { user } = await requireSession();
    await call("update_personal_goal", [user.id, input.goal, input.difficulty]);
    return json({ ok: true });
  });
}
