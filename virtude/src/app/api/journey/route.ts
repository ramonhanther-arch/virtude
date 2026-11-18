import { requireSession } from "@/lib/server/context";
import { handleRoute, json, readJson } from "@/lib/server/http";
import { changeJourney } from "@/lib/server/journey-service";
import { consumeLimit } from "@/lib/server/rate-limit";
import { journeySchema } from "@/lib/server/schemas";

export async function POST(request: Request) { return handleRoute(async () => {
  const input = await readJson(request, journeySchema);
  const { user } = await requireSession();
  await consumeLimit(user.id, "journey", 30, 60);
  await changeJourney(user.id, input);
  return json({ ok: true });
}); }
