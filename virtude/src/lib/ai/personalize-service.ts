import "server-only";
import type { Personalization, PersonalizationInput } from "@/lib/personalize";
import { buildPersonalizationPayload, fallbackPersonalization, validatePersonalization } from "@/lib/personalize";

export async function personalizePractice(input: PersonalizationInput, fetcher: typeof fetch = fetch): Promise<Personalization> {
  const fallback = fallbackPersonalization(input);
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!key || !model) return fallback;
  try {
    const payload = buildPersonalizationPayload(input, model);
    const response = await fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!response.ok) return fallback;
    const data = await response.json() as { status?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
    if (data.status !== "completed") return fallback;
    const output = data.output?.filter((item) => item.type === "message").flatMap((item) => item.content ?? []);
    if (output?.some((item) => item.type === "refusal")) return fallback;
    const body = output?.filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("");
    if (!body || body.length > 4000) return fallback;
    return validatePersonalization(JSON.parse(body), input.reference);
  } catch {
    return fallback;
  }
}
