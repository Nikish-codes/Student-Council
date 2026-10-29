import { redirect } from "next/navigation";

import { getOvalServiceDate } from "@/lib/oval-date";

export const dynamic = "force-dynamic";

export default function OvalPage() {
  redirect(`/oval/${getOvalServiceDate()}`);
}
