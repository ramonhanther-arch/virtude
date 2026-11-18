import { isDay7Return, recordAnalytics } from "@/lib/server/analytics";
import { requireContext } from "@/lib/server/context";
import { handleRoute, json } from "@/lib/server/http";
import { ensurePersonalization } from "@/lib/server/personalization";

export const dynamic = "force-dynamic";

export async function GET() { return handleRoute(async () => {
  const { user, state } = await requireContext();
  const ready = await ensurePersonalization(user.id, state);
  if (ready.today) await recordAnalytics(user.id, "mission_view", { focus: ready.today.focus, day: ready.today.day, variant: ready.today.variant });
  if (isDay7Return(user.createdAt)) await recordAnalytics(user.id, "day7_return");
  return json(ready);
}); }
