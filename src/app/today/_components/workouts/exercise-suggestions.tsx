"use client";

import { useState, useTransition } from "react";
import type { MuscleGroup } from "@/db/schema";
import { getExerciseSuggestionsAction, type SuggestionsState } from "@/app/workouts/actions";
import type { ExercisePrefill } from "./workout-log-form";

export function ExerciseSuggestions({
  targetMuscleGroups,
  onAddToLog,
}: {
  targetMuscleGroups: MuscleGroup[];
  onAddToLog: (prefill: ExercisePrefill) => void;
}) {
  const [state, setState] = useState<SuggestionsState>(undefined);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSuggest() {
    startTransition(async () => {
      const result = await getExerciseSuggestionsAction(targetMuscleGroups, notes);
      setState(result);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Exercise suggestions
        </h2>
        <button
          onClick={handleSuggest}
          disabled={pending || targetMuscleGroups.length === 0}
          className="retro-glow rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Thinking..." : "Suggest exercises"}
        </button>
      </div>

      {targetMuscleGroups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Set this day&apos;s target muscle groups in Settings to get suggestions.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Based on this day&apos;s target: {targetMuscleGroups.join(", ")}.
        </p>
      )}

      <input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Equipment available, an exercise to avoid/include..."
        className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}

      {state && "suggestions" in state && (
        <ul className="flex flex-col gap-2">
          {state.suggestions.map((suggestion, index) => (
            <li key={index} className="rounded-md border border-border bg-background p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{suggestion.name}</p>
                <span className="text-xs text-muted-foreground">{suggestion.setsAndReps}</span>
              </div>
              <p className="mt-1 text-xs text-accent">{suggestion.reason}</p>
              <button
                type="button"
                onClick={() =>
                  onAddToLog({
                    name: suggestion.name,
                    muscleGroup: suggestion.muscleGroup,
                    setsAndReps: suggestion.setsAndReps,
                  })
                }
                className="mt-2 text-xs text-muted-foreground hover:text-accent"
              >
                + Add to log
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
