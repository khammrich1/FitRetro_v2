"use client";

import { useState, useTransition } from "react";
import type { MissionFieldIndex, MissionForDay } from "@/features/daily-mission";
import {
  setMissionFieldAction,
  toggleMissionFieldCompletionAction,
} from "@/app/daily-mission/actions";

const FIELDS: {
  index: MissionFieldIndex;
  textKey: keyof MissionForDay;
  completedKey: keyof MissionForDay;
}[] = [
  { index: 1, textKey: "field1", completedKey: "field1Completed" },
  { index: 2, textKey: "field2", completedKey: "field2Completed" },
  { index: 3, textKey: "field3", completedKey: "field3Completed" },
];

function MissionFieldRow({
  fieldIndex,
  text,
  completed,
  dayIso,
}: {
  fieldIndex: MissionFieldIndex;
  text: string;
  completed: boolean;
  dayIso: string;
}) {
  const [value, setValue] = useState(text);
  const [pending, startTransition] = useTransition();

  function handleBlur() {
    if (value === text) return;
    startTransition(async () => {
      await setMissionFieldAction(dayIso, fieldIndex, value);
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleMissionFieldCompletionAction(dayIso, fieldIndex);
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-sm">
      <input
        type="checkbox"
        checked={completed}
        onChange={handleToggle}
        disabled={pending}
        className="h-4 w-4 accent-primary"
      />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
        placeholder={`Mission item ${fieldIndex}...`}
        disabled={pending}
        className={
          "flex-1 bg-transparent focus:outline-none" +
          (completed ? " text-muted-foreground line-through" : "")
        }
      />
    </div>
  );
}

export function DailyMissionCard({ mission, dayIso }: { mission: MissionForDay; dayIso: string }) {
  const completedCount = FIELDS.filter((f) => Boolean(mission[f.completedKey])).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="retro-heading text-lg font-semibold text-primary">Today&apos;s mission</h2>
        <span className="text-xs text-muted-foreground">{completedCount}/3</span>
      </div>
      <div className="flex flex-col gap-2 rounded-lg border-2 border-accent bg-card p-4">
        {FIELDS.map((f) => (
          <MissionFieldRow
            key={f.index}
            fieldIndex={f.index}
            text={String(mission[f.textKey] ?? "")}
            completed={Boolean(mission[f.completedKey])}
            dayIso={dayIso}
          />
        ))}
      </div>
    </section>
  );
}
