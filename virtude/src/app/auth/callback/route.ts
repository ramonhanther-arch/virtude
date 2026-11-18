import { consumeResetToken, openSession } from "@/lib/server/accounts";
import { consumeAuthLimit } from "@/lib/server/auth-abuse";
import { rows } from "@/lib/server/db";
import { appOrigin, ApiError, handleRoute } from "@/lib/server/http";
import { sealSession } from "@/lib/server/session-cookie";

export async function GET(request: Request) { return handleRoute(async () => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");
  if (!token || token.length > 128 || !email || email.length > 254) throw new ApiError(400, "Link inválido ou expirado.");
  await consumeAuthLimit(request, "callback");
  const user = await consumeResetToken(email, token);
  if (!user) throw new ApiError(400, "Link inválido ou expirado.");
  const sessionToken = await openSession(user);
  const [consent] = await rows<{ sensitive_data: boolean }>(`select sensitive_data from public.consents where user_id = $1`, [user.id]);
  const destination = url.searchParams.get("next") === "/redefinir" ? "/redefinir" : consent?.sensitive_data ? "/app" : "/onboarding";
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${appOrigin()}${destination}`,
      "Cache-Control": "no-store",
      "Set-Cookie": await sealSession({ sub: user.id, email: user.email, sessionToken, createdAt: user.createdAt, role: user.role }),
    },
  });
}); }
