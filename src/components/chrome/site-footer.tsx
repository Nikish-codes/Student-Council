import Link from "next/link";
import { NikishEasterEgg } from "@/components/chrome/nikish-easter-egg";

const FOOTER_NAV = [
  {
    title: "Explore",
    items: [
      { href: "/", label: "Home", disabled: true },
      { href: "/oval", label: "Oval", disabled: true },
      { href: "/sports", label: "Sports" },
      { href: "/council", label: "Council", disabled: true },
      { href: "/events", label: "Events", disabled: true },
      { href: "/clubs", label: "Clubs", disabled: true },
      { href: "/support", label: "Support", disabled: true },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/support#gateway", label: "Gateway", disabled: true },
      { href: "/support#bridge", label: "Bridge", disabled: true },
      { href: "/support#career-connect", label: "Career Connect", disabled: true },
      { href: "/support#grievance-form", label: "Grievance", disabled: true },
    ],
  },
  {
    title: "Connect",
    items: [
      { href: "https://woxsen.edu.in", label: "woxsen.edu.in" },
      { href: "mailto:council@woxsen.edu.in", label: "council@woxsen.edu.in" },
      { href: "https://instagram.com/woxsenuniversity", label: "Instagram" },
      {
        href: "https://linkedin.com/school/woxsen-university",
        label: "LinkedIn",
      },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t border-line/10 bg-bg">
      <div className="container py-20">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="relative flex min-h-32 items-center justify-center lg:col-span-5">
            <span className="sr-only">Woxsen University</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/woxsen-university-white.webp"
              alt=""
              aria-hidden
              width={896}
              height={415}
              loading="lazy"
              decoding="async"
              className="theme-logo-on-dark h-auto w-full max-w-[14rem] object-contain"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/woxsen-university-color.webp"
              alt=""
              aria-hidden
              width={896}
              height={413}
              loading="lazy"
              decoding="async"
              className="theme-logo-on-light absolute inset-y-0 left-1/2 my-auto h-auto w-full -translate-x-1/2 max-w-[14rem] object-contain"
            />
          </div>
          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-7">
            {FOOTER_NAV.map((col) => (
              <div key={col.title}>
                <span className="kicker">{col.title}</span>
                <ul className="mt-5 space-y-3">
                  {col.items.map((item) => (
                    <li key={item.href}>
                      {item.disabled ? (
                        <span
                          className="prose-link text-sm text-subtle/50 cursor-not-allowed"
                          title="Coming soon"
                        >
                          {item.label}
                          <span className="ml-1 align-super font-mono text-[9px] uppercase tracking-[0.15em] text-subtle/40">
                            soon
                          </span>
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          className="prose-link text-sm text-muted transition-colors hover:text-ink"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line/10 pt-8 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono">
            © {new Date().getFullYear()} Woxsen Student Council
          </span>
          <span className="font-mono">
            v1.0 · Hyderabad, IN · Designed and built by <NikishEasterEgg />
          </span>
        </div>
      </div>
    </footer>
  );
}
