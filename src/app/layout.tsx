import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { BootOverlay } from "@/components/system/boot-overlay";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://council.woxsen.edu.in"),
  description:
    "The official portal of the Woxsen University Student Council — events, clubs, leadership, and student support.",
  title: {
    default: "Woxsen Student Council",
    template: "%s | Woxsen Student Council",
  },
  applicationName: "Woxsen Student Council",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/brand/sc-black.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/brand/sc-black.png",
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
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <BootOverlay />
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgb(17 17 17)",
              border: "1px solid rgb(255 255 255 / 0.08)",
              color: "rgb(245 245 244)",
            },
          }}
        />
      </body>
    </html>
  );
}
