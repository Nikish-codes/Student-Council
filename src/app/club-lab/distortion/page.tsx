import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DistortionClubLab } from "./distortion-club-lab";
import { getClub, getClubEvents, getClubLeads } from "@/lib/content";

export const metadata: Metadata = {
  title: "Distortion club page lab",
  robots: { index: false, follow: false },
};

export default async function DistortionClubLabPage() {
  const club = await getClub("distortion");
  if (!club) notFound();

  const [{ upcoming, past }, leads] = await Promise.all([
    getClubEvents(club.id),
    getClubLeads(club.id),
  ]);

  return (
    <DistortionClubLab
      club={club}
      upcoming={upcoming}
      past={past}
      leads={leads}
    />
  );
}
