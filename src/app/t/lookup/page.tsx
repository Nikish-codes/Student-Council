import type { Metadata } from "next";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = {
  title: "Find my ticket",
  description: "Recover your event ticket by email or phone.",
  robots: { index: false, follow: false },
};

export default function LookupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-5 py-12">
      <div>
        <p className="kicker text-accent">Ticket recovery</p>
        <h1 className="display mt-1 text-3xl text-ink">Find my ticket</h1>
        <p className="mt-2 text-sm text-muted">
          Lost the link? Enter the email or phone number you registered with and
          we&apos;ll pull up your tickets.
        </p>
      </div>
      <LookupForm />
    </main>
  );
}
