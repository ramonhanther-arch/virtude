import type { Metadata } from "next";
import { ReviewPanel } from "@/components/review-panel";
import { requireSession } from "@/lib/server/context";
import { isContentReviewer } from "@/lib/server/review-access";
import { listReviews } from "@/lib/server/review-service";

export const metadata: Metadata = { title: "Revisão teológica" };

export default async function Page() {
  const view = await loadReviewView();
  return <ReviewPanel initial={view.initial} denied={view.denied} />;
}

async function loadReviewView() {
  try {
    const { user } = await requireSession();
    if (!isContentReviewer(user.email ?? undefined, { role: user.role })) return { initial: null, denied: true as const };
    return { initial: await listReviews(), denied: false as const };
  } catch {
    return { initial: null, denied: true as const };
  }
}
