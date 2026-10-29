import { revalidatePath } from "next/cache";

export function revalidateSportsHub() {
  revalidatePath("/sports");
  revalidatePath("/sports/calendar");
  revalidatePath("/sports/year/[year]", "page");
  revalidatePath("/sports/calendar/[year]", "page");
}
