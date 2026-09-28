"use client";

import { useState, useTransition } from "react";
import { setProgressPhotoDayAction } from "@/app/progress/actions";
import { WEEKDAYS } from "@/features/progress-photos/reminder";

/** Saves as soon as it changes — no separate save button for a single setting. */
export function ReminderDaySelect({ current }: { current: number | null }) {
  const [value, setValue] = useState(current === null ? "off" : String(current));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Remind me on Today every</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          setSaved(false);
          startTransition(async () => {
            await setProgressPhotoDayAction(next);
            setSaved(true);
          });
        }}
        className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {WEEKDAYS.map((name, index) => (
          <option key={name} value={String(index)}>
            {name}
          </option>
        ))}
        <option value="off">Never (reminder off)</option>
      </select>
      <span role="status" className="text-xs text-accent">
        {pending ? "Saving..." : saved ? "Saved" : ""}
      </span>
    </label>
  );
}
