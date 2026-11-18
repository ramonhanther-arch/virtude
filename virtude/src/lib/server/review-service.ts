import "server-only";
import { missions } from "@/content/missions";
import type { Focus, ReviewStatus } from "@/lib/types";
import { call, rows } from "./db";
import { loadReviewNotes } from "./review-notes";

export type ReviewListItem = {
  id: string;
  focus: Focus;
  day: number;
  phase: string;
  title: string;
  reference: string;
  context: string;
  principle: string;
  practice: string;
  simplified: string;
  deepened: string;
  reflectionQuestion: string;
  status: ReviewStatus;
  attention: string;
  referenceUrl: string | null;
  latest: { decision: ReviewStatus; note: string; reviewerEmail: string; createdAt: string } | null;
};

const statuses = new Set<ReviewStatus>(["pending_review", "approved", "needs_changes", "rejected"]);

export async function listReviews() {
  const notes = loadReviewNotes();
  const remote = await readRemote();
  const items: ReviewListItem[] = missions.map((mission) => {
    const note = notes.get(mission.id);
    const template = remote?.templates.get(`${mission.focus}:${mission.day}`);
    const latest = remote?.decisions.get(`${mission.focus}:${mission.day}`) ?? null;
    const status = template && statuses.has(template) ? template : "pending_review";
    return {
      id: mission.id, focus: mission.focus, day: mission.day, phase: mission.phase, title: mission.title,
      reference: mission.reference, context: mission.context, principle: mission.principle, practice: mission.practice,
      simplified: mission.simplified, deepened: mission.deepened, reflectionQuestion: mission.reflectionQuestion,
      status, attention: note?.attention ?? "Nota editorial indisponível neste ambiente.", referenceUrl: note?.referenceUrl ?? null, latest,
    };
  });
  const counts = { pending_review: 0, approved: 0, needs_changes: 0, rejected: 0 };
  for (const item of items) counts[item.status] += 1;
  return { items, counts, persistence: remote ? "ready" as const : "unavailable" as const };
}

export async function applyReviewDecision(reviewerEmail: string, input: { focus: Focus; day: number; decision: "approved" | "needs_changes" | "rejected"; note: string }) {
  return call("apply_content_review", [input.focus, input.day, input.decision, input.note, reviewerEmail]);
}

export function reviewsToCsv(items: ReviewListItem[]) {
  const header = ["id", "focus", "day", "phase", "title", "reference", "status", "attention", "reviewer", "reviewed_at", "note"];
  const lines = [header.join(",")];
  for (const item of items) {
    lines.push([
      item.id, item.focus, String(item.day), item.phase, item.title, item.reference, item.status, item.attention,
      item.latest?.reviewerEmail ?? "", item.latest?.createdAt ?? "", item.latest?.note ?? "",
    ].map(csvCell).join(","));
  }
  return lines.join("\n");
}

async function readRemote() {
  try {
    const templates = await rows<{ focus: string; day: number; review_status: ReviewStatus }>(
      `select focus, day, review_status from public.mission_templates`,
    );
    const decisions = await rows<{ focus: string; day: number; decision: ReviewStatus; note: string; reviewer_email: string; created_at: string }>(
      `select focus, day, decision, note, reviewer_email, created_at from public.content_review_decisions order by created_at desc`,
    );
    const templateMap = new Map<string, ReviewStatus>();
    for (const row of templates) templateMap.set(`${row.focus}:${row.day}`, row.review_status);
    const decisionMap = new Map<string, ReviewListItem["latest"]>();
    for (const row of decisions) {
      const key = `${row.focus}:${row.day}`;
      if (decisionMap.has(key)) continue;
      decisionMap.set(key, { decision: row.decision, note: row.note, reviewerEmail: row.reviewer_email, createdAt: row.created_at });
    }
    return { templates: templateMap, decisions: decisionMap };
  } catch {
    return null;
  }
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
