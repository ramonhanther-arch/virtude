import { requireSession } from "@/lib/server/context";
import { handleRoute, json, readJson } from "@/lib/server/http";
import { updateSettings } from "@/lib/server/journey-service";
import { consumeLimit } from "@/lib/server/rate-limit";
import { settingsSchema } from "@/lib/server/schemas";

export async function PATCH(request: Request) { return handleRoute(async () => {
  const input = await readJson(request, settingsSchema);
  const { user } = await requireSession();
  await consumeLimit(user.id, "settings", 30, 60);
  await updateSettings(user.id, input);
  return json({ ok: true });
}); }
