import { redirect } from "next/navigation";

/** The temporary comparison URL now resolves to the selected production view. */
export default function OvalDemoRedirect() {
  redirect("/oval");
}
