import "server-only";
import { ApiError } from "@/lib/server/http";
import { buildMentorPayload, validateMentorOutput, type MentorRequest, type MentorOutput } from "./mentor-core";
import type { AppState, Mission } from "@/lib/types";

export async function generateMentorReply(input: MentorRequest, state: AppState, catalog: Mission[], fetcher: typeof fetch = fetch): Promise<MentorOutput> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!key || !model) throw new ApiError(503, "O Mentor ainda não está configurado. Suas práticas continuam disponíveis.", "AI_UNAVAILABLE");
  const allowPending = process.env.NODE_ENV !== "production" && process.env.ALLOW_UNREVIEWED_CONTENT === "true";
  const payload = buildMentorPayload(input, state, catalog, model, allowPending);
  const source = JSON.parse(payload.input[0].content) as { library: { reference: string }[] };
  try {
    const response = await fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("upstream_failed");
    const data = await response.json() as {
      status?: string;
      output?: { type: string; content?: { type: string; text?: string }[] }[];
    };
    if (data.status !== "completed") throw new Error("incomplete");
    const output = data.output?.filter((item) => item.type === "message").flatMap((item) => item.content ?? []);
    if (output?.some((item) => item.type === "refusal")) throw new Error("refusal");
    const body = output?.filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("");
    if (!body || body.length > 12000) throw new Error("invalid_response");
    return validateMentorOutput(JSON.parse(body), new Set(source.library.map((entry) => entry.reference)), input.mode);
  } catch {
    // Nunca registrar corpo do provedor, mensagens pessoais ou credenciais.
    throw new ApiError(502, "O Mentor não conseguiu responder agora. Tente novamente em alguns instantes.", "AI_RESPONSE_FAILED");
  }
}
