import Link from "next/link";
import { eq } from "drizzle-orm";
import { Calendar, Megaphone, Plus, Clock } from "lucide-react";
import { db } from "@/db/client";
import { events as eventsT, announcements as annT } from "@/db/schema";
import { requireOps } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

export default async function ManagementHome() {
  const user = await requireOps();
  const [totalEvents, pending, published, announcements] = await Promise.all([
    db.$count(eventsT),
    db.$count(eventsT, eq(eventsT.status, "pending_review")),
    db.$count(eventsT, eq(eventsT.status, "published")),
    db.$count(annT),
  ]);

  const stats = [
    { label: "Events", value: totalEvents, icon: Calendar },
    { label: "Published", value: published, icon: Clock },
    { label: "Awaiting review", value: pending, icon: Clock },
    { label: "Announcements", value: announcements, icon: Megaphone },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker text-subtle">Welcome back</p>
          <h1 className="display mt-1 text-3xl">{user.name?.split(" ")[0]}</h1>
        </div>
        <Button asChild>
          <Link href="/management/events/new">
            <Plus className="h-4 w-4" /> New event
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface-card rounded-2xl p-5">
            <s.icon className="h-5 w-5 text-subtle" />
            <p className="mt-4 text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h2 className="text-lg font-medium">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/management/events">Manage events</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/management/events/new">Add an event</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-subtle">
          Publishing an event automatically posts an announcement, creates a
          recap draft, refreshes the site, and (if configured) pings Discord.
        </p>
      </div>
    </div>
  );
}
