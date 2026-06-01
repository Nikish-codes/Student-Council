/**
 * Edge-safe Auth.js base config. Contains NO database or bcrypt imports so it
 * can run in the middleware (edge) runtime. The Credentials provider (which
 * needs Node APIs) is added in `src/auth.ts`.
 */
import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/db/schema";

export const authConfig = {
  pages: { signIn: "/management/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [], // real providers added in auth.ts
  callbacks: {
    // Gate /management/** behind a session (the login page is excluded by the
    // middleware matcher). Used by the middleware's `auth` wrapper.
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isLogin = path.startsWith("/management/login");
      const isManagement = path.startsWith("/management");
      if (isManagement && !isLogin) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: UserRole }).role ?? "viewer";
        token.clubId = (user as { clubId?: number | null }).clubId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid ?? "");
        session.user.role = (token.role as UserRole) ?? "viewer";
        session.user.clubId = (token.clubId as number | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
