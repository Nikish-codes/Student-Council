import type { Metadata } from "next";
import { Teaser } from "./teaser";

export const metadata: Metadata = {
  title: "Coming Soon",
  description:
    "Something new from the Woxsen Student Council is on its way. Stay tuned.",
  // Keep the holding page (and, while the gate is up, the site behind it) out of
  // search indexes until launch.
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return <Teaser />;
}
