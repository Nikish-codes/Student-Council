import Link from "next/link";
import { NikishEasterEgg } from "@/components/chrome/nikish-easter-egg";

const FOOTER_NAV = [
  {
    title: "Explore",
    items: [
      { href: "/", label: "Home" },
      { href: "/oval", label: "Oval" },
      { href: "/sports", label: "Sports" },
      { href: "/council", label: "Council" },
      { href: "/events", label: "Events" },
      { href: "/clubs", label: "Clubs" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/support#gateway", label: "Gateway" },
      { href: "/support#bridge", label: "Bridge" },
      { href: "/support#career-connect", label: "Career Connect" },
      { href: "/support#grievance-form", label: "Grievance" },
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
            {/* The university wordmark is a two-colour logo in its light-theme
                form, so unlike the crest it can't be a single masked shape —
                both variants stay. They are web-sized WebP (896px for a 448px
                box) instead of the 1200px print PNGs, carry intrinsic
                dimensions so they reserve their own space, and load lazily:
                the footer is below the fold on every page, so these bytes have
                no business competing with the content someone came to read. */}
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
                      <Link
                        href={item.href}
                        className="prose-link text-sm text-muted transition-colors hover:text-ink"
                      >
                        {item.label}
                      </Link>
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
