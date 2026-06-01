"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/management/login" })}
      className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
