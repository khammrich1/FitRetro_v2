"use client";

import { useState } from "react";
import type { MuscleGroup } from "@/db/schema";
import { WorkoutLogForm, type ExercisePrefill } from "./workout-log-form";
import { ExerciseSuggestions } from "./exercise-suggestions";

export function WorkoutLogging({ targetMuscleGroups }: { targetMuscleGroups: MuscleGroup[] }) {
  const [prefill, setPrefill] = useState<ExercisePrefill | null>(null);

  return (
    <>
      <WorkoutLogForm prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />
      <ExerciseSuggestions targetMuscleGroups={targetMuscleGroups} onAddToLog={setPrefill} />
    </>
  );
}
