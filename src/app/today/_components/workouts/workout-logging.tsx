"use client";

import { useState } from "react";
import type { MuscleGroup } from "@/db/schema";
import { WorkoutLogForm, type ExercisePrefill, type TemplateToLoad } from "./workout-log-form";
import { ExerciseSuggestions } from "./exercise-suggestions";
import type { WorkoutTemplateWithExercises } from "@/features/workouts";

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
  const [templateToLoad, setTemplateToLoad] = useState<TemplateToLoad | null>(null);

  function loadTemplate(template: WorkoutTemplateWithExercises) {
    setTemplateToLoad({
      name: template.name,
      exercises: template.exercises.map((exercise) => ({
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        setsAndReps: exercise.targetSetsReps,
      })),
    });
  }

  return (
    <>
      {templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Load a template:
          </span>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => loadTemplate(template)}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent"
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
        templateToLoad={templateToLoad}
        onTemplateLoaded={() => setTemplateToLoad(null)}
      />
      <ExerciseSuggestions targetMuscleGroups={targetMuscleGroups} onAddToLog={setPrefill} />
    </>
  );
}
