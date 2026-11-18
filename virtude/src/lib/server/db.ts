import "server-only";
import postgres from "postgres";
import { ApiError, databaseError } from "./http";

const functions = new Set([
  "complete_onboarding", "save_checkin", "change_journey", "update_settings", "set_reminder_email",
  "save_day_personalization", "create_activity", "save_mentor_exchange", "update_personal_goal",
  "consume_rate_limit", "consume_auth_limit", "delete_account", "apply_content_review",
]);

let client: ReturnType<typeof postgres> | undefined;

type HyperdriveBinding = { connectionString?: string };

function hyperdriveConnectionString() {
  const context = (globalThis as Record<symbol, { env?: { HYPERDRIVE?: HyperdriveBinding } } | undefined>)[Symbol.for("__cloudflare-context__")];
  const fromContext = context?.env?.HYPERDRIVE?.connectionString;
  if (fromContext) return fromContext;
  return (globalThis as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE?.connectionString;
}

export function databaseUrl() {
  return hyperdriveConnectionString() || process.env.DATABASE_URL;
}

export function getSql() {
  const url = databaseUrl();
  if (!url) throw new ApiError(503, "Serviço indisponível.", "CONFIGURATION_REQUIRED");
  if (!client) client = postgres(url, { max: 5, prepare: false, connect_timeout: 10, onnotice: () => undefined });
  return client;
}

export function resetSqlForTests() {
  client = undefined;
}

function fail(error: unknown): never {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code ?? "") : "";
  const message = typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message ?? "") : "";
  const normalized = message.includes("Content unavailable") ? "Content unavailable" : message.split("\n")[0];
  databaseError({ code, message: normalized });
  throw new ApiError(503, "Serviço indisponível.", "DATABASE_UNAVAILABLE");
}

export async function rows<T extends Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    return await getSql().unsafe(text, params as never[]) as unknown as T[];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return fail(error);
  }
}

export async function call<T = unknown>(name: string, params: unknown[] = []): Promise<T | null> {
  if (!functions.has(name)) throw new ApiError(500, "Não foi possível concluir.", "INTERNAL_ERROR");
  const placeholders = params.map((_, index) => `$${index + 1}`).join(",");
  const result = await rows<Record<string, T>>(`select public.${name}(${placeholders}) as result`, params);
  return result[0]?.result ?? null;
}

