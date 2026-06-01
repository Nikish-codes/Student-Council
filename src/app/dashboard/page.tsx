import { redirect } from "next/navigation";

// The legacy Payload-backed dashboard is superseded by the custom /management
// panel. Funnel everyone there. (Full removal happens in the Payload cleanup.)
export default function LegacyDashboardRedirect() {
  redirect("/management");
}
