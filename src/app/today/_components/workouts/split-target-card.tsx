"use client";

import { useTransition } from "react";
import type { SplitCycleTarget } from "@/features/workouts";
import { toggleSplitCycleCompletionAction } from "@/app/workouts/actions";

export function SplitTargetCard({
  target,
  dayIso,
}: {
  target: SplitCycleTarget | null;
  dayIso: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleSplitCycleCompletionAction(dayIso);
    });
  }

  if (!target) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No rotation set up yet — build one in Settings &gt; Workouts.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm">
      <input
        type="checkbox"
        checked={target.completedToday}
        onChange={handleToggle}
        disabled={pending}
        className="h-4 w-4 accent-primary"
      />
      <div>
        <p className={target.completedToday ? "text-muted-foreground line-through" : ""}>
          Target: <span className="font-medium text-accent">{target.label}</span>{" "}
          <span className="text-muted-foreground">
            ({target.muscleGroups.map((group) => group.replace("_", " ")).join(", ")})
          </span>
        </p>
        {target.completedToday && target.nextLabel && (
          <p className="text-xs text-muted-foreground">Up next: {target.nextLabel}</p>
        )}
      </div>
    </div>
  );
}
