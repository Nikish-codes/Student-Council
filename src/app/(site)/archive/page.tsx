import type { Metadata } from "next";
import { ArchiveCanvas } from "@/components/sections/archive-canvas";
import { getPastEvents } from "@/lib/content";

export const metadata: Metadata = {
  title: "Event Archive",
  description:
    "Every past event run by the Woxsen Student Council — bootcamps, hackathons, cultural nights, sports cups and more, on the record.",
};

export default async function ArchivePage() {
  const past = await getPastEvents();
  return <ArchiveCanvas events={past} />;
}
