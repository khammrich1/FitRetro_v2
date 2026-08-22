import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyNotes } from "@/db/schema";

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

/** Today's (or `day`'s) note — "" if nothing's been saved for this day yet. */
export async function getDailyNoteForDay(userId: string, day: Date): Promise<string> {
  const dayIso = toDateOnly(day);
  const [row] = await db
    .select({ note: dailyNotes.note })
    .from(dailyNotes)
    .where(and(eq(dailyNotes.userId, userId), eq(dailyNotes.day, dayIso)));

  return row?.note ?? "";
}

export async function setDailyNoteForDay(userId: string, day: Date, note: string): Promise<void> {
  const dayIso = toDateOnly(day);

  await db
    .insert(dailyNotes)
    .values({ userId, day: dayIso, note })
    .onConflictDoUpdate({
      target: [dailyNotes.userId, dailyNotes.day],
      set: { note },
    });
}
