import { requireSession } from "@/lib/server/context";
import { handleRoute, json, readJson } from "@/lib/server/http";
import { onboard } from "@/lib/server/journey-service";
import { consumeLimit } from "@/lib/server/rate-limit";
import { onboardingSchema } from "@/lib/server/schemas";

export async function POST(request: Request) { return handleRoute(async () => {
  const input = await readJson(request, onboardingSchema);
  const { user } = await requireSession();
  await consumeLimit(user.id, "onboarding", 5, 3600);
  await onboard(user.id, input);
  return json({ ok: true });
}); }
