import type { Metadata } from "next";
import { SportsHub } from "./sports-hub";

export const metadata: Metadata = {
  title: "Sports Academy",
  description:
    "Woxsen Sports Academy — tournaments, leagues, matches, and live scores.",
};

export const revalidate = 3600;

export default function SportsPage() {
  return <SportsHub />;
}
