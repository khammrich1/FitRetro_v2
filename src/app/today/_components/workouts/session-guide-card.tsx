"use client";

import { useState } from "react";
import type { Movement, SessionGuide } from "@/features/workouts/session-guide";

function MovementList({ items, kind }: { items: Movement[]; kind: "dynamic" | "static" }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((movement) => (
        <li key={movement.id} className="rounded-md border border-border bg-background p-2 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="font-medium text-foreground">{movement.name}</span>
            <span className="text-xs text-accent">{movement.dose}</span>
          </div>
          <p className="mt-1 text-muted-foreground">{movement.how}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {kind === "dynamic" ? "Works: " : "Stretches: "}
            {movement.targets.join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** The warm-up → lift → cooldown guide for the viewed day, collapsed by default so the logging
 * controls below stay one tap away. Pure static content (see @/features/workouts/session-guide);
 * what it shows depends only on the day's split, which the server already resolved. */
export function SessionGuideCard({ guide, dayLabel }: { guide: SessionGuide; dayLabel: string }) {
  const [open, setOpen] = useState(false);
  const isWorkout = guide.kind === "workout";
  const summary = isWorkout
    ? `Warm-up & cooldown for ${dayLabel}`
    : "Rest day — easy mobility & stretches";

  return (
    <section className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="session-guide-body"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:text-accent"
      >
        <span className="min-w-0 truncate font-medium">🧘 {summary}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div id="session-guide-body" className="flex flex-col gap-4 border-t border-border p-4">
          {isWorkout ? (
            <ol className="flex flex-col gap-2 text-sm">
              {guide.sequence.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="shrink-0 font-semibold text-accent">{index + 1}.</span>
                  <span>
                    <span className="font-medium text-foreground">{step.title}</span>
                    <span className="text-muted-foreground"> — {step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              No workout is scheduled for this day. If you feel like moving, here&apos;s an easy
              all-round set — gentle range of motion, nothing forced.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">
              {isWorkout ? "Dynamic mobility (before lifting)" : "Easy mobility"}
            </h3>
            <MovementList items={guide.dynamic} kind="dynamic" />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">
              {isWorkout ? "Cooldown stretches (after cardio)" : "Stretches"}
            </h3>
            <MovementList items={guide.static} kind="static" />
          </div>

          <p className="text-xs text-muted-foreground">
            Stay in a comfortable range and breathe — a stretch should feel mild, never sharp. If
            something hurts, skip it. This is general guidance, not treatment for an injury.
          </p>
        </div>
      )}
    </section>
  );
}
