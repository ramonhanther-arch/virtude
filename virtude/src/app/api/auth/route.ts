import { auth } from "@/auth";
import { closeSession, createAccount, findUserByEmail, openSession, replacePassword, storeResetToken } from "@/lib/server/accounts";
import { consumeAuthLimit } from "@/lib/server/auth-abuse";
import { checkPassword } from "@/lib/server/passwords";
import { rows } from "@/lib/server/db";
import { ApiError, handleRoute, json, readJson } from "@/lib/server/http";
import { authSchema } from "@/lib/server/schemas";
import { clearSessionCookie, sealSession } from "@/lib/server/session-cookie";

function withCookie(response: Response, cookie: string) {
  response.headers.append("Set-Cookie", cookie);
  return response;
}

export async function POST(request: Request) { return handleRoute(async () => {
  const input = await readJson(request, authSchema);
  if (input.action === "logout") {
    const session = await auth();
    await closeSession(session?.sessionToken);
    return withCookie(json({ redirectTo: "/entrar" }), clearSessionCookie());
  }
  await consumeAuthLimit(request, input.action);
  if (input.action === "reset") {
    const session = await auth();
    if (!session?.user?.id || !session.sessionToken) throw new ApiError(401, "Entre para continuar.", "UNAUTHENTICATED");
    await replacePassword(session.user.id, input.password);
    await closeSession(session.sessionToken);
    return withCookie(json({ message: "Senha atualizada. Entre novamente.", redirectTo: "/entrar" }), clearSessionCookie());
  }
  if (input.action === "login") {
    const user = await findUserByEmail(input.email);
    if (!user?.passwordHash || !(await checkPassword(input.password, user.passwordHash))) throw new ApiError(401, "E-mail ou senha inválidos.", "AUTH_FAILED");
    const sessionToken = await openSession(user);
    const [consent] = await rows<{ sensitive_data: boolean }>(`select sensitive_data from public.consents where user_id = $1`, [user.id]);
    const response = json({ redirectTo: consent?.sensitive_data ? "/app" : "/onboarding" });
    return withCookie(response, await sealSession({ sub: user.id, email: user.email, sessionToken, createdAt: user.createdAt, role: user.role }));
  }
  if (input.action === "signup") {
    await createAccount(input.email, input.password);
    return json({ message: "Se o cadastro estiver disponível, você receberá um e-mail para confirmar." });
  }
  await storeResetToken(input.email);
  return json({ message: "Se houver uma conta com esse e-mail, enviaremos as instruções." });
}); }
