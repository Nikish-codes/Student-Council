/**
 * Edge middleware — protects /management/** using the edge-safe auth config
 * (no bcrypt/db). Unauthenticated users are redirected to /management/login
 * via the `authorized` callback in auth.config.ts.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/management/:path*", "/eventmanagement/:path*"],
};
