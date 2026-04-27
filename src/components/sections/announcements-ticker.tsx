import Link from "next/link";
import { Megaphone } from "lucide-react";
import { Marquee } from "@/components/motion/marquee";
import { getAnnouncements } from "@/lib/content";

export async function AnnouncementsTicker() {
  const items = await getAnnouncements();

  return (
    <section
      aria-label="Announcements"
      className="relative border-y border-line/10 bg-surface/40 py-5 backdrop-blur-sm"
    >
      <div className="container flex items-center gap-6">
        <div className="flex shrink-0 items-center gap-2">
          <Megaphone className="h-3.5 w-3.5 text-ink" aria-hidden />
          <span className="kicker">Latest</span>
        </div>
        <Marquee speed={50} className="flex-1">
          {items.map((a) => {
            const Inner = (
              <span className="inline-flex items-center gap-3 text-sm text-ink">
                {a.pinned && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
                )}
                {a.title}
                <span aria-hidden className="text-subtle">·</span>
                <span className="font-mono text-xs text-muted">
                  {new Date(a.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span aria-hidden className="mx-6 text-line/30">/</span>
              </span>
            );
            return a.href ? (
              <Link
                key={a.id}
                href={a.href}
                className="transition-opacity hover:opacity-70"
              >
                {Inner}
              </Link>
            ) : (
              <span key={a.id}>{Inner}</span>
            );
          })}
        </Marquee>
      </div>
    </section>
  );
}
