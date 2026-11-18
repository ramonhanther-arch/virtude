import "server-only";
import type { Adapter, AdapterAccount, AdapterSession, AdapterUser, VerificationToken } from "next-auth/adapters";
import { getSql } from "./db";

// Auth.js Postgres adapter against the Neon tables. Credentials login writes
// sessions directly; the adapter keeps the same tables usable by Auth.js.
export function postgresAdapter(): Adapter {
  const adapter = {
    async createUser(user: AdapterUser) {
      const sql = getSql();
      const [row] = await sql<{ id: string; name: string | null; email: string; emailVerified: Date | null; image: string | null }[]>`
        insert into public.users (name, email, "emailVerified", image)
        values (${user.name ?? null}, ${user.email}, ${user.emailVerified ?? null}, ${user.image ?? null})
        returning id, name, email, "emailVerified", image`;
      return { ...row, emailVerified: row.emailVerified };
    },
    async getUser(id: string) {
      const sql = getSql();
      const [row] = await sql`select id, name, email, "emailVerified", image from public.users where id = ${id}::uuid`;
      return row ?? null;
    },
    async getUserByEmail(email: string) {
      const sql = getSql();
      const [row] = await sql`select id, name, email, "emailVerified", image from public.users where email = ${email}`;
      return row ?? null;
    },
    async getUserByAccount({ provider, providerAccountId }: Pick<AdapterAccount, "provider" | "providerAccountId">) {
      const sql = getSql();
      const [row] = await sql`
        select u.id, u.name, u.email, u."emailVerified", u.image
        from public.users u join public.accounts a on a."userId" = u.id
        where a.provider = ${provider} and a."providerAccountId" = ${providerAccountId}`;
      return row ?? null;
    },
    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const sql = getSql();
      const [row] = await sql`
        update public.users set
          name = coalesce(${user.name ?? null}, name),
          email = coalesce(${user.email ?? null}, email),
          "emailVerified" = coalesce(${user.emailVerified ?? null}, "emailVerified"),
          image = coalesce(${user.image ?? null}, image)
        where id = ${user.id}::uuid
        returning id, name, email, "emailVerified", image`;
      return row;
    },
    async deleteUser(id: string) {
      const sql = getSql();
      await sql`delete from public.users where id = ${id}::uuid`;
    },
    async linkAccount(account: AdapterAccount) {
      const sql = getSql();
      await sql.unsafe(
        `insert into public.accounts ("userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [account.userId, account.type, account.provider, account.providerAccountId, account.refresh_token ?? null, account.access_token ?? null, account.expires_at ?? null, account.token_type ?? null, account.scope ?? null, account.id_token ?? null, account.session_state == null ? null : String(account.session_state)],
      );
    },
    async unlinkAccount({ provider, providerAccountId }: Pick<AdapterAccount, "provider" | "providerAccountId">) {
      const sql = getSql();
      await sql`delete from public.accounts where provider = ${provider} and "providerAccountId" = ${providerAccountId}`;
    },
    async createSession(session: { sessionToken: string; userId: string; expires: Date }) {
      const sql = getSql();
      const [row] = await sql`
        insert into public.sessions ("sessionToken", "userId", expires)
        values (${session.sessionToken}, ${session.userId}::uuid, ${session.expires})
        returning "sessionToken", "userId", expires`;
      return row;
    },
    async getSessionAndUser(sessionToken: string) {
      const sql = getSql();
      const [row] = await sql`
        select s."sessionToken", s."userId", s.expires, u.id, u.name, u.email, u."emailVerified", u.image
        from public.sessions s join public.users u on u.id = s."userId"
        where s."sessionToken" = ${sessionToken} and s.expires > now()`;
      if (!row) return null;
      return {
        session: { sessionToken: row.sessionToken, userId: row.userId, expires: row.expires },
        user: { id: row.id, name: row.name, email: row.email, emailVerified: row.emailVerified, image: row.image },
      };
    },
    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) {
      const sql = getSql();
      const [row] = await sql`
        update public.sessions set expires = coalesce(${session.expires ?? null}, expires)
        where "sessionToken" = ${session.sessionToken}
        returning "sessionToken", "userId", expires`;
      return row ?? null;
    },
    async deleteSession(sessionToken: string) {
      const sql = getSql();
      await sql`delete from public.sessions where "sessionToken" = ${sessionToken}`;
    },
    async createVerificationToken(token: VerificationToken) {
      const sql = getSql();
      const [row] = await sql`
        insert into public.verification_tokens (identifier, token, expires)
        values (${token.identifier}, ${token.token}, ${token.expires})
        returning identifier, token, expires`;
      return row;
    },
    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const sql = getSql();
      const [row] = await sql`
        delete from public.verification_tokens
        where identifier = ${identifier} and token = ${token}
        returning identifier, token, expires`;
      return row ?? null;
    },
  };
  return adapter as unknown as Adapter;
}
