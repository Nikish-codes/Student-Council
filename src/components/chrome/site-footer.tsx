import Link from "next/link";

const FOOTER_NAV = [
  {
    title: "Explore",
    items: [
      { href: "/", label: "Home" },
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
      { href: "https://linkedin.com/school/woxsen-university", label: "LinkedIn" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t border-line/10 bg-bg">
      <div className="container py-20">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="kicker">Woxsen Student Council</span>
            <p className="display mt-6 text-balance text-4xl sm:text-5xl">
              Built for students.<br />Run by students.
            </p>
            <p className="mt-6 max-w-md text-muted">
              The official portal of the Woxsen University Student Council.
              Reach out, get involved, run for office.
            </p>
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
                        className="text-sm text-muted transition-colors hover:text-ink"
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
          <span className="font-mono">v1.0 · Hyderabad, IN</span>
        </div>
      </div>
    </footer>
  );
}
