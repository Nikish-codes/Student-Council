import type { Metadata } from "next";
import { SiteHeader } from "@/components/chrome/site-header";
import { SiteFooter } from "@/components/chrome/site-footer";
import { SmoothScrollProvider } from "@/components/chrome/smooth-scroll-provider";
import { GrainOverlay } from "@/components/chrome/grain-overlay";
import { DottedBackground } from "@/components/chrome/dotted-background";

export const metadata: Metadata = {
  title: "Woxsen Student Council",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScrollProvider>
      <DottedBackground />
      <GrainOverlay />
      <div className="relative z-10">
        <SiteHeader />
        <main id="content">{children}</main>
        <SiteFooter />
      </div>
    </SmoothScrollProvider>
  );
}
