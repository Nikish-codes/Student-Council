import type { Metadata } from "next";
import { SupportGuide } from "@/components/sections/support-guide";
import { getSupportChannels, getSiteSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Student Support",
  description:
    "How to reach the right desk at Woxsen — and what the Student Council can (and can't) do to help.",
};

export default async function SupportPage() {
  const [channels, settings] = await Promise.all([
    getSupportChannels(),
    getSiteSettings(),
  ]);

  return (
    <div className="pt-24 sm:pt-28">
      <SupportGuide
        channels={channels}
        grievanceCategories={settings.grievanceCategories}
        grievanceMailTo={settings.grievanceMailTo}
      />
    </div>
  );
}
