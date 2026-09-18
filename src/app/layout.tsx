import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { BootOverlay } from "@/components/system/boot-overlay";
import { ThemeToggle } from "@/components/system/theme-toggle";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// `style` defaults to ["normal"], so every italic on the site — the hero accent
// line, the president's message, every council member's quote — was a browser
// slant of the roman rather than Fraunces' own italic, which has genuinely
// different letterforms. Requesting it costs one more file on a site whose
// identity is this serif.
const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.woxsenstudentcouncil.in"),
  description:
    "The official portal of the Woxsen University Student Council — events, clubs, leadership, and student support.",
  title: {
    default: "Woxsen Student Council",
    template: "%s | Woxsen Student Council",
  },
  applicationName: "Woxsen Student Council",
  alternates: {
    canonical: "/",
  },
  // The 1563×1563 master was being served as the favicon on every page load —
  // 134KB to fill a 16px square. These are the same artwork at the sizes each
  // slot actually renders (see scripts/optimize-brand-assets.ts). The master
  // stays in /public for the OG card below, which genuinely wants the big one.
  icons: {
    icon: [{ url: "/favicon-48.png", type: "image/png", sizes: "48x48" }],
    shortcut: "/favicon-48.png",
    apple: [{ url: "/icon-180.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Woxsen Student Council",
    description:
      "Empowering student voices @ Woxsen — events, clubs, leadership and support.",
    type: "website",
    images: ["/brand/sc-black.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Sync the html class with localStorage BEFORE first paint so the boot
  // overlay + first render use the user's saved theme. Default is dark
  // (matches the base :root tokens) so this only runs to *opt into light*.
  const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <BootOverlay />
        {children}
        <ThemeToggle />
        <Toaster
          theme="dark"
          position="bottom-left"
          toastOptions={{
            style: {
              background: "rgb(17 17 17)",
              border: "1px solid rgb(255 255 255 / 0.08)",
              color: "rgb(245 245 244)",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
