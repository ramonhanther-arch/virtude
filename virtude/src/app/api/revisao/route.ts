import { requireSession } from "@/lib/server/context";
import { ApiError, handleRoute, json, readJson } from "@/lib/server/http";
import { isContentReviewer } from "@/lib/server/review-access";
import { applyReviewDecision, listReviews } from "@/lib/server/review-service";
import { reviewDecisionSchema } from "@/lib/server/schemas";

async function requireReviewer() {
  const session = await requireSession();
  if (!isContentReviewer(session.user.email ?? undefined, { role: session.user.role })) throw new ApiError(403, "Esta revisão é restrita à equipe editorial.", "FORBIDDEN");
  if (!session.user.email) throw new ApiError(403, "Esta revisão é restrita à equipe editorial.", "FORBIDDEN");
  return session;
}

export async function GET() {
  return handleRoute(async () => {
    await requireReviewer();
    return json(await listReviews());
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const input = await readJson(request, reviewDecisionSchema);
    const { user } = await requireReviewer();
    await applyReviewDecision(user.email!, input);
    return json({ ok: true });
  });
}
