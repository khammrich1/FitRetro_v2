import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyMissions, type DailyMission } from "@/db/schema";

export type MissionFieldIndex = 1 | 2 | 3;

export type MissionForDay = Omit<DailyMission, "id"> & { id: string | null };

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

const BLANK_MISSION: Omit<DailyMission, "id" | "userId" | "day"> = {
  field1: "",
  field1Completed: false,
  field2: "",
  field2Completed: false,
  field3: "",
  field3Completed: false,
};

/** Today's (or `day`'s) mission — always exactly 3 fields, blank/uncompleted if nothing's been
 * saved for this day yet. `id` is null when nothing's been saved, since there's no row yet. */
export async function getMissionForDay(userId: string, day: Date): Promise<MissionForDay> {
  const dayIso = toDateOnly(day);
  const [mission] = await db
    .select()
    .from(dailyMissions)
    .where(and(eq(dailyMissions.userId, userId), eq(dailyMissions.day, dayIso)));

  return mission ?? { id: null, userId, day: dayIso, ...BLANK_MISSION };
}

function fieldColumn(fieldIndex: MissionFieldIndex) {
  if (fieldIndex === 1) return { text: "field1", completed: "field1Completed" } as const;
  if (fieldIndex === 2) return { text: "field2", completed: "field2Completed" } as const;
  return { text: "field3", completed: "field3Completed" } as const;
}

export async function setMissionField(
  userId: string,
  day: Date,
  fieldIndex: MissionFieldIndex,
  value: string,
): Promise<void> {
  const dayIso = toDateOnly(day);
  const column = fieldColumn(fieldIndex).text;

  await db
    .insert(dailyMissions)
    .values({ userId, day: dayIso, [column]: value })
    .onConflictDoUpdate({
      target: [dailyMissions.userId, dailyMissions.day],
      set: { [column]: value },
    });
}

/** Toggles completion of one of the day's 3 fields. Returns the new completed state. */
export async function toggleMissionFieldCompletion(
  userId: string,
  day: Date,
  fieldIndex: MissionFieldIndex,
): Promise<boolean> {
  const dayIso = toDateOnly(day);
  const current = await getMissionForDay(userId, day);
  const column = fieldColumn(fieldIndex).completed;
  const newValue = !current[column as "field1Completed" | "field2Completed" | "field3Completed"];

  await db
    .insert(dailyMissions)
    .values({ userId, day: dayIso, [column]: newValue })
    .onConflictDoUpdate({
      target: [dailyMissions.userId, dailyMissions.day],
      set: { [column]: newValue },
    });

  return newValue;
}
