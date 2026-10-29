import type { Metadata } from "next";
import { SportsCalendar } from "./sports-calendar";

export const metadata: Metadata = {
  title: "Sports Calendar",
  description:
    "The Woxsen Sports Academy fixture calendar — matches and results, month by month.",
};

export const revalidate = 3600;

export default function CalendarPage() {
  return <SportsCalendar />;
}
