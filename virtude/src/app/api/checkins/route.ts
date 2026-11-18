import { requireSession } from "@/lib/server/context";
import { handleRoute, json, readJson } from "@/lib/server/http";
import { saveCheckin } from "@/lib/server/journey-service";
import { consumeLimit } from "@/lib/server/rate-limit";
import { checkinSchema } from "@/lib/server/schemas";

export async function POST(request: Request) { return handleRoute(async () => {
  const input = await readJson(request, checkinSchema);
  const { user } = await requireSession();
  await consumeLimit(user.id, "checkins", 30, 60);
  await saveCheckin(user.id, input);
  return json({ ok: true });
}); }
