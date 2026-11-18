import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type ReviewNote = { referenceUrl: string; consultedOn: string; attention: string };

export function contentReviewPath() {
  const candidates = [
    path.resolve(process.cwd(), "../docs/virtude/CONTENT-REVIEW.md"),
    path.resolve(process.cwd(), "docs/virtude/CONTENT-REVIEW.md"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function loadReviewNotes() {
  const notes = new Map<string, ReviewNote>();
  const file = contentReviewPath();
  if (!file) return notes;
  const row = /^\| \d+ \| `([0-9a-f-]{36})` — .+ \| \[[^\]]+\]\((https:\/\/ebible\.org\/[^)]+)\) \| (\d{4}-\d{2}-\d{2}) \| (?:pending_review|approved|needs_changes|rejected) \| (.+?) \| (.+) \|$/;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = row.exec(line);
    if (!match) continue;
    notes.set(match[1], { referenceUrl: match[2], consultedOn: match[3], attention: match[4] });
  }
  return notes;
}
