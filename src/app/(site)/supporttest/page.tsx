import type { Metadata } from "next";
import { SupportTest } from "@/components/sections/support-test";
import { getSiteSettings, getSupportChannels } from "@/lib/content";

export const metadata: Metadata = {
  title: "Support Page Concepts",
  description:
    "Five student-first directions for finding the right support at Woxsen.",
  robots: { index: false, follow: false },
};

export default async function SupportTestPage() {
  const [channels, settings] = await Promise.all([
    getSupportChannels(),
    getSiteSettings(),
  ]);

  return (
    <SupportTest
      channels={channels}
      grievanceCategories={settings.grievanceCategories}
      grievanceMailTo={settings.grievanceMailTo}
    />
  );
}
