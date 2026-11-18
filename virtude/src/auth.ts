import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { postgresAdapter } from "@/lib/server/auth-adapter";

export const { handlers, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  adapter: postgresAdapter(),
  providers: [
    Credentials({
      credentials: { email: { label: "E-mail" }, password: { label: "Senha" } },
      authorize: async () => null,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.sessionToken = user.sessionToken;
        token.createdAt = user.createdAt;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      if (typeof token.email === "string") session.user.email = token.email;
      if (typeof token.sessionToken === "string") session.sessionToken = token.sessionToken;
      session.user.createdAt = typeof token.createdAt === "string" ? token.createdAt : undefined;
      session.user.role = typeof token.role === "string" ? token.role : "user";
      return session;
    },
  },
});
