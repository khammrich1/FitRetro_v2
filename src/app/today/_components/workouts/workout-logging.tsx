"use client";

import { useState, useTransition } from "react";
import type { MuscleGroup } from "@/db/schema";
import { WorkoutLogForm, type ExercisePrefill } from "./workout-log-form";
import { ExerciseSuggestions } from "./exercise-suggestions";
import type { WorkoutTemplateWithExercises } from "@/features/workouts";
import { startWorkoutFromTemplateAction } from "@/app/workouts/actions";

export function WorkoutLogging({
  dayIso,
  targetMuscleGroups,
  templates,
}: {
  dayIso: string;
  targetMuscleGroups: MuscleGroup[];
  templates: WorkoutTemplateWithExercises[];
}) {
  const [prefill, setPrefill] = useState<ExercisePrefill | null>(null);
  const [pending, startTransition] = useTransition();

  function startFromTemplate(templateId: string) {
    startTransition(async () => {
      await startWorkoutFromTemplateAction(templateId, dayIso);
    });
  }

  return (
    <>
      {templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Start from a template:
          </span>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => startFromTemplate(template.id)}
              disabled={pending}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {template.name}
            </button>
          ))}
        </div>
      )}
      <WorkoutLogForm
        dayIso={dayIso}
        prefill={prefill}
        onPrefillConsumed={() => setPrefill(null)}
      />
      <ExerciseSuggestions targetMuscleGroups={targetMuscleGroups} onAddToLog={setPrefill} />
    </>
  );
}
