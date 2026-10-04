"use server";

import { revalidatePath } from "next/cache";
import { isValidTimeZone } from "@/lib/date";
import { verifySession } from "./dal";
import { setUserTimeZone } from "./queries";

/** Saves the browser's IANA time zone on the account (see components/ui/timezone-sync). Junk is
 * ignored rather than erroring — the zone is a convenience, never worth breaking a page over. */
export async function setTimeZoneAction(timeZone: string): Promise<void> {
  const { userId } = await verifySession();
  if (typeof timeZone !== "string" || !isValidTimeZone(timeZone)) return;
  await setUserTimeZone(userId, timeZone);
  // "Today" may have just changed for this member.
  revalidatePath("/today");
  revalidatePath("/calendar");
}
