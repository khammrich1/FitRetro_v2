"use client";

import { useState, useTransition } from "react";
import type { RoutineWithItems, RoutineItemWithCompletion } from "@/features/routines";
import {
  toggleRoutineItemCompletionAction,
  updateRoutineCompletionNotesAction,
} from "@/app/routine/actions";

function ChecklistItemRow({ item, dayIso }: { item: RoutineItemWithCompletion; dayIso: string }) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(item.completionNotes ?? "");
  const [, startSavingNotes] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleRoutineItemCompletionAction(item.id, dayIso);
    });
  }

  function handleNotesBlur() {
    startSavingNotes(async () => {
      await updateRoutineCompletionNotesAction(item.id, notes, dayIso);
    });
  }

  return (
    <li className="flex flex-col gap-1 rounded-md border border-border bg-background p-2 text-sm">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={item.completedToday}
          onChange={handleToggle}
          disabled={pending}
          className="h-4 w-4 accent-primary"
        />
        <span
          className={item.completedToday ? "flex-1 text-muted-foreground line-through" : "flex-1"}
        >
          {item.name}
        </span>
      </div>
      {item.notes && <p className="pl-6 text-xs text-muted-foreground">{item.notes}</p>}
      {item.completedToday && (
        <div className="pl-6">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={handleNotesBlur}
            placeholder="What did you actually do? (optional)"
            rows={1}
            className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}
    </li>
  );
}

export function RoutineChecklistCard({
  routine,
  dayIso,
}: {
  routine: RoutineWithItems;
  dayIso: string;
}) {
  const completedCount = routine.items.filter((item) => item.completedToday).length;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          {routine.name}
        </h2>
        {routine.items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{routine.items.length}
          </span>
        )}
      </div>

      {routine.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No steps yet — add some in Settings &gt; Routine templates.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {routine.items.map((item) => (
            // Keying on completedToday remounts the row on toggle, so the notes textarea
            // re-initializes from the fresh (or cleared) completion note instead of keeping
            // stale local state from a previous day's completion.
            <ChecklistItemRow
              key={`${item.id}-${item.completedToday}`}
              item={item}
              dayIso={dayIso}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
