import "server-only";
import { z } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}
export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", Vary: "Cookie" } });
}
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  try { return await fn(); }
  catch (error) {
    if (error instanceof ApiError) return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
    return json({ error: "Não foi possível concluir. Tente novamente.", code: "INTERNAL_ERROR" }, 500);
  }
}
export function appOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) throw new ApiError(503, "Serviço indisponível.", "CONFIGURATION_REQUIRED");
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || !["http:", "https:"].includes(url.protocol) || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error();
    return url.origin;
  } catch { throw new ApiError(503, "Serviço indisponível.", "CONFIGURATION_REQUIRED"); }
}
export function assertSameOrigin(request: Request): void {
  if (request.headers.get("origin") !== appOrigin() || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "Origem não autorizada.", "INVALID_ORIGIN");
}
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  assertSameOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" || request.headers.has("content-encoding")) throw new ApiError(415, "Envie JSON.", "INVALID_CONTENT_TYPE");
  const max = 32 * 1024;
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw new ApiError(413, "Conteúdo muito grande.", "BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Dados inválidos.", "INVALID_INPUT");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new ApiError(413, "Conteúdo muito grande.", "BODY_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new ApiError(400, "Dados inválidos.", "INVALID_INPUT"); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new ApiError(400, "Dados inválidos.", "INVALID_INPUT");
  return result.data;
}
export function databaseError(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (error.code === "P0429") throw new ApiError(429, "Limite atingido. Tente novamente mais tarde.", "RATE_LIMITED");
  if (error.code === "42501") throw new ApiError(403, "Operação não autorizada.", "FORBIDDEN");
  if (error.code === "P0001") {
    if (error.message === "Content unavailable") throw new ApiError(503, "Conteúdo aguardando revisão humana.", "CONTENT_PENDING_REVIEW");
    throw new ApiError(409, "Esta ação não está disponível agora. Atualize a página e confira a prática do dia.", "STATE_CONFLICT");
  }
  if (["22023", "23514", "23503", "23505", "22P02"].includes(error.code ?? "")) throw new ApiError(400, "Dados inválidos.", "INVALID_INPUT");
  throw new ApiError(503, "Serviço indisponível. Tente novamente.", "DATABASE_UNAVAILABLE");
}
