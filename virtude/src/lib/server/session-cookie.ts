import "server-only";
import { encode } from "next-auth/jwt";
import { ApiError } from "./http";

export function sessionCookieName() {
  const url = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const secure = url.startsWith("https://");
  return `${secure ? "__Secure-" : ""}authjs.session-token`;
}

export async function sealSession(token: { sub: string; email: string; sessionToken: string; createdAt: string; role: string }) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, "Serviço indisponível.", "CONFIGURATION_REQUIRED");
  const name = sessionCookieName();
  const value = await encode({ token, secret, salt: name, maxAge: 30 * 24 * 60 * 60 });
  const secure = name.startsWith("__Secure-");
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie() {
  const name = sessionCookieName();
  const secure = name.startsWith("__Secure-");
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
