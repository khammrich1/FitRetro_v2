export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** A check-in this recent already counts for the week, so the reminder day stays quiet. */
const RECENT_ENOUGH_DAYS = 5;
/** Past this, nudge on any day — not just the reminder day. */
const OVERDUE_DAYS = 10;

function dayNumber(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function weekdayOf(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export type ProgressPhotoReminder =
  { kind: "due"; weekday: string } | { kind: "overdue"; daysSince: number } | null;

/** Whether Today should show a progress-pic reminder.
 * - On the chosen weekday: yes, unless there's already a check-in from the last few days.
 * - Any other day: only once it's been OVERDUE_DAYS since the last check-in, so a missed
 *   reminder day doesn't mean a missed week. Never for someone who has never taken one —
 *   the reminder day covers that without nagging daily.
 * - Reminder off (null): never. */
export function progressPhotoReminder({
  reminderDay,
  todayIso,
  lastPhotoDay,
}: {
  reminderDay: number | null | undefined;
  todayIso: string;
  lastPhotoDay: string | null;
}): ProgressPhotoReminder {
  if (reminderDay == null || reminderDay < 0 || reminderDay > 6) return null;
  const daysSince = lastPhotoDay ? dayNumber(todayIso) - dayNumber(lastPhotoDay) : null;

  if (weekdayOf(todayIso) === reminderDay) {
    if (daysSince !== null && daysSince < RECENT_ENOUGH_DAYS) return null;
    return { kind: "due", weekday: WEEKDAYS[reminderDay] };
  }
  if (daysSince !== null && daysSince >= OVERDUE_DAYS) return { kind: "overdue", daysSince };
  return null;
}
