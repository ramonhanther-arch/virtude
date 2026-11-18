import { z } from "zod";
import { requireContext } from "@/lib/server/context";
import { call } from "@/lib/server/db";
import { ApiError, handleRoute, json, readJson } from "@/lib/server/http";

const activitySchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  confirmed: z.literal(true),
}).strict();

export function POST(request: Request) {
  return handleRoute(async () => {
    const input = await readJson(request, activitySchema);
    const { user, state } = await requireContext();
    if (!state.consents.sensitiveData) throw new ApiError(403, "O consentimento para dados sensíveis é necessário.");
    await call("create_activity", [user.id, input.title, input.description]);
    return json({ ok: true });
  });
}
