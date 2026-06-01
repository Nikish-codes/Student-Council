import type { UserRole } from "@/db/schema";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      clubId: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    clubId?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: UserRole;
    clubId?: number | null;
  }
}
