import "server-only";

export function reviewerAllowlist() {
  return new Set((process.env.VIRTUDE_CONTENT_REVIEWERS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter((item) => item.includes("@")));
}

export function isContentReviewer(email: string | undefined, appMetadata: unknown) {
  const role = appMetadata && typeof appMetadata === "object" && "role" in appMetadata ? (appMetadata as { role?: unknown }).role : undefined;
  if (role === "admin") return true;
  if (!email) return false;
  return reviewerAllowlist().has(email.trim().toLowerCase());
}
