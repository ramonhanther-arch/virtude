import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { call } from "./db";
import { ApiError } from "./http";

export async function consumeAuthLimit(request: Request, operation: "login" | "signup" | "forgot" | "reset" | "callback") {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32 || !process.env.DATABASE_URL) throw new ApiError(503, "Serviço indisponível.", "CONFIGURATION_REQUIRED");
  let ip: string;
  if (process.env.TRUST_AUTH_PROXY === "true") {
    const candidate = request.headers.get("x-real-ip")?.trim();
    if (!candidate || !isIP(candidate)) throw new ApiError(503, "Serviço indisponível.", "TRUSTED_IP_REQUIRED");
    ip = candidate;
  } else if (process.env.NODE_ENV !== "production") ip = "local-development";
  else throw new ApiError(503, "Serviço indisponível.", "TRUSTED_IP_REQUIRED");
  const subject = createHmac("sha256", secret).update(ip).digest("hex");
  const allowed = await call<boolean>("consume_auth_limit", [subject, operation]);
  if (allowed !== true) throw new ApiError(429, "Muitas tentativas. Tente mais tarde.", "RATE_LIMITED");
}
