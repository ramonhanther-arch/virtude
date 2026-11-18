import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { getSql } from "./db";
import { ApiError } from "./http";
import { checkPassword, hashPassword } from "./passwords";

export type AccountUser = { id: string; email: string; createdAt: string; role: string; passwordHash: string };

export async function findUserByEmail(email: string) {
  const sql = getSql();
  const [row] = await sql<AccountUser[]>`
    select id, email, created_at as "createdAt", role, password_hash as "passwordHash"
    from public.users where email = ${email.toLowerCase()}`;
  return row ?? null;
}

export async function createAccount(email: string, password: string) {
  const sql = getSql();
  const passwordHash = await hashPassword(password);
  const normalized = email.toLowerCase();
  return sql.begin(async (tx) => {
    const [user] = await tx<{ id: string; created_at: Date }[]>`
      insert into public.users (email, password_hash, "emailVerified")
      values (${normalized}, ${passwordHash}, now())
      on conflict (email) do nothing
      returning id, created_at`;
    if (!user) return null;
    await tx`insert into public.profiles (user_id) values (${user.id})`;
    await tx`insert into public.consents (user_id) values (${user.id})`;
    await tx`insert into public.subscriptions (user_id, plan_code) values (${user.id}, 'free')`;
    await tx`insert into public.accounts ("userId", type, provider, "providerAccountId") values (${user.id}, 'credentials', 'credentials', ${user.id})`;
    await tx`insert into public.analytics_events (user_id, event, properties) values (${user.id}, 'signup', '{}'::jsonb)`;
    return { id: user.id, createdAt: user.created_at.toISOString() };
  });
}

export async function openSession(user: { id: string }) {
  const sql = getSql();
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sql`insert into public.sessions ("sessionToken", "userId", expires) values (${sessionToken}, ${user.id}, ${expires})`;
  return sessionToken;
}

export async function closeSession(sessionToken: string | undefined) {
  if (!sessionToken) return;
  const sql = getSql();
  await sql`delete from public.sessions where "sessionToken" = ${sessionToken}`;
}

export async function assertPassword(userId: string, password: string) {
  const sql = getSql();
  const [row] = await sql<{ password_hash: string | null }[]>`select password_hash from public.users where id = ${userId}::uuid`;
  if (!row?.password_hash || !(await checkPassword(password, row.password_hash))) throw new ApiError(401, "Senha incorreta.", "REAUTHENTICATION_FAILED");
}

export async function replacePassword(userId: string, password: string) {
  const sql = getSql();
  const passwordHash = await hashPassword(password);
  await sql`update public.users set password_hash = ${passwordHash} where id = ${userId}::uuid`;
  await sql`delete from public.sessions where "userId" = ${userId}::uuid`;
}

export async function storeResetToken(email: string) {
  const sql = getSql();
  const [user] = await sql<{ id: string }[]>`select id from public.users where email = ${email.toLowerCase()}`;
  if (!user) return;
  const raw = randomBytes(32).toString("hex");
  const token = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await sql`insert into public.verification_tokens (identifier, token, expires) values (${email.toLowerCase()}, ${token}, ${expires})`;
  return raw;
}

export async function consumeResetToken(email: string, rawToken: string) {
  const sql = getSql();
  const token = createHash("sha256").update(rawToken).digest("hex");
  const [row] = await sql<{ identifier: string }[]>`
    delete from public.verification_tokens
    where identifier = ${email.toLowerCase()} and token = ${token} and expires > now()
    returning identifier`;
  if (!row) throw new ApiError(400, "Link inválido ou expirado.");
  return findUserByEmail(email);
}
