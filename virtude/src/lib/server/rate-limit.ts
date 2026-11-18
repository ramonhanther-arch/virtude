import "server-only";
import { call } from "./db";
import { ApiError } from "./http";

export async function consumeLimit(userId: string, operation: string, limit: number, windowSeconds: number): Promise<void> {
  const allowed = await call<boolean>("consume_rate_limit", [userId, operation, limit, windowSeconds]);
  if (allowed !== true) throw new ApiError(429, "Limite de uso atingido. Tente mais tarde.", "RATE_LIMITED");
}
