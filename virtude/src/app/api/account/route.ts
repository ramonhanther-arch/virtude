import { auth } from "@/auth";
import { assertPassword, closeSession } from "@/lib/server/accounts";
import { call } from "@/lib/server/db";
import { ApiError, handleRoute, json, readJson } from "@/lib/server/http";
import { consumeLimit } from "@/lib/server/rate-limit";
import { accountSchema } from "@/lib/server/schemas";
import { clearSessionCookie } from "@/lib/server/session-cookie";
import { requireSession } from "@/lib/server/context";

export async function DELETE(request: Request) { return handleRoute(async () => {
  const input = await readJson(request, accountSchema);
  const { user } = await requireSession();
  await consumeLimit(user.id, "account", 3, 3600);
  if (!user.email) throw new ApiError(400, "Não foi possível confirmar a conta.");
  await assertPassword(user.id, input.password);
  await call("delete_account", [user.id]);
  const session = await auth();
  await closeSession(session?.sessionToken).catch(() => undefined);
  const response = json({ ok: true });
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}); }
