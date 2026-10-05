/** Works out when a dose was actually taken from what the user gave us.
 * - A time ("HH:MM", from a native time input) on the chosen day is exact.
 * - No time on today's date means "just now".
 * - No time on any other day is unknown: we don't invent a moment, and the level estimate
 *   leaves the dose out rather than reading a yesterday dose as a fresh one. */
export function resolveAdministeredAt({
  dayIso,
  todayIso,
  time,
  now = new Date(),
}: {
  dayIso: string;
  todayIso: string;
  time: string | null | undefined;
  now?: Date;
}): Date | null {
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const at = new Date(`${dayIso}T${time}:00`);
    return Number.isNaN(at.getTime()) ? null : at;
  }
  return dayIso === todayIso ? now : null;
}

/** "HH:MM" of a moment in local time, for prefilling a time input. */
export function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
