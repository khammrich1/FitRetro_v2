"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { muscleGroupEnum, type MuscleGroup } from "@/db/schema";
import { useSpeechToText } from "@/lib/hooks/use-speech-to-text";
import {
  logWorkoutAction,
  estimateWorkoutAction,
  getExerciseSuggestionsAction,
  type EstimateWorkoutState,
  type SuggestionsState,
} from "../actions";

type EditableSet = {
  reps: string;
  weightLbs: string;
  durationSeconds: string;
  rpe: string;
};

type EditableExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  sets: EditableSet[];
};

const blankSet: EditableSet = { reps: "", weightLbs: "", durationSeconds: "", rpe: "" };

function blankExercise(): EditableExercise {
  return { name: "", muscleGroup: muscleGroupEnum.enumValues[0], sets: [{ ...blankSet }] };
}

export type ExercisePrefill = {
  name: string;
  muscleGroup: MuscleGroup;
  setsAndReps?: string;
};

export type TemplateToLoad = {
  name: string;
  exercises: ExercisePrefill[];
};

function parseSetsAndReps(setsAndReps: string | undefined): EditableSet[] {
  const match = setsAndReps?.match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return [{ ...blankSet }];
  const count = Math.min(Number(match[1]) || 1, 10);
  const reps = match[2];
  return Array.from({ length: count }, () => ({ ...blankSet, reps }));
}

function isBlankExercise(exercise: EditableExercise) {
  return (
    exercise.name.trim() === "" &&
    exercise.sets.every(
      (set) =>
        set.reps.trim() === "" &&
        set.weightLbs.trim() === "" &&
        set.durationSeconds.trim() === "" &&
        set.rpe.trim() === "",
    )
  );
}

export function WorkoutLogForm({
  prefill,
  onPrefillConsumed,
  templateToLoad,
  onTemplateLoaded,
}: {
  prefill?: ExercisePrefill | null;
  onPrefillConsumed?: () => void;
  templateToLoad?: TemplateToLoad | null;
  onTemplateLoaded?: () => void;
}) {
  const [state, action, pending] = useActionState(logWorkoutAction, undefined);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<EditableExercise[]>([blankExercise()]);
  const [estimateResult, setEstimateResult] = useState<EstimateWorkoutState>(undefined);
  const [estimating, startEstimating] = useTransition();
  const [handledPrefill, setHandledPrefill] = useState<ExercisePrefill | null>(null);
  const [handledTemplate, setHandledTemplate] = useState<TemplateToLoad | null>(null);
  const [substituteIndex, setSubstituteIndex] = useState<number | null>(null);
  const [substituteNotes, setSubstituteNotes] = useState("");
  const [substituteResult, setSubstituteResult] = useState<SuggestionsState>(undefined);
  const [substituting, startSubstituting] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    isListening,
    isSupported: micSupported,
    toggleListening,
    error: micError,
  } = useSpeechToText((transcript) => {
    setDescription((current) => (current ? `${current} ${transcript}` : transcript));
  });

  const {
    isListening: isSubstituteListening,
    isSupported: substituteMicSupported,
    toggleListening: toggleSubstituteListening,
    error: substituteMicError,
  } = useSpeechToText((transcript) => {
    setSubstituteNotes((current) => (current ? `${current} ${transcript}` : transcript));
  });

  // Adjust local state in response to a new prefill during render (React's recommended pattern),
  // rather than in an effect.
  if (prefill && prefill !== handledPrefill) {
    setHandledPrefill(prefill);
    const newExercise: EditableExercise = {
      name: prefill.name,
      muscleGroup: prefill.muscleGroup,
      sets: parseSetsAndReps(prefill.setsAndReps),
    };
    setExercises((current) =>
      current.length === 1 && isBlankExercise(current[0])
        ? [newExercise]
        : [...current, newExercise],
    );
  }

  // Loading a template fully replaces the exercise list and pre-fills the workout name.
  if (templateToLoad && templateToLoad !== handledTemplate) {
    setHandledTemplate(templateToLoad);
    setName(templateToLoad.name);
    setExercises(
      templateToLoad.exercises.length > 0
        ? templateToLoad.exercises.map((exercise) => ({
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: parseSetsAndReps(exercise.setsAndReps),
          }))
        : [blankExercise()],
    );
  }

  useEffect(() => {
    if (!handledPrefill) return;
    onPrefillConsumed?.();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handledPrefill]);

  useEffect(() => {
    if (!handledTemplate) return;
    onTemplateLoaded?.();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handledTemplate]);

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.errors) {
      setName("");
      setDescription("");
      setExercises([blankExercise()]);
      setEstimateResult(undefined);
      closeSubstitute();
    }
    wasPending.current = pending;
  }, [pending, state]);

  function handleClear() {
    formRef.current?.reset();
    setName("");
    setDescription("");
    setExercises([blankExercise()]);
    setEstimateResult(undefined);
    closeSubstitute();
  }

  function handleEstimate() {
    startEstimating(async () => {
      const result = await estimateWorkoutAction(description);
      setEstimateResult(result);
      if (result && "estimate" in result) {
        setExercises(
          result.estimate.exercises.map((exercise) => ({
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: exercise.sets.map((set) => ({
              reps: set.reps !== null ? String(set.reps) : "",
              weightLbs: set.weightLbs !== null ? String(set.weightLbs) : "",
              durationSeconds: set.durationSeconds !== null ? String(set.durationSeconds) : "",
              rpe: set.rpe !== null ? String(set.rpe) : "",
            })),
          })),
        );
      }
    });
  }

  function updateExerciseField(index: number, field: "name" | "muscleGroup", value: string) {
    setExercises((current) =>
      current.map((exercise, i) => (i === index ? { ...exercise, [field]: value } : exercise)),
    );
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: keyof EditableSet,
    value: string,
  ) {
    setExercises((current) =>
      current.map((exercise, i) =>
        i === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, j) =>
                j === setIndex ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  }

  function addExercise() {
    setExercises((current) => [...current, blankExercise()]);
  }

  function removeExercise(index: number) {
    setExercises((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );
    if (substituteIndex === index) closeSubstitute();
  }

  function openSubstitute(index: number) {
    setSubstituteIndex(index);
    setSubstituteNotes("");
    setSubstituteResult(undefined);
  }

  function closeSubstitute() {
    setSubstituteIndex(null);
    setSubstituteNotes("");
    setSubstituteResult(undefined);
  }

  function handleGetSubstitutes() {
    if (substituteIndex === null) return;
    const target = exercises[substituteIndex];
    const notes =
      substituteNotes.trim() ||
      (target.name.trim() ? `A different exercise instead of ${target.name}.` : undefined);
    startSubstituting(async () => {
      const result = await getExerciseSuggestionsAction([target.muscleGroup], notes);
      setSubstituteResult(result);
    });
  }

  function applySubstitute(suggestion: {
    name: string;
    muscleGroup: MuscleGroup;
    setsAndReps: string;
  }) {
    if (substituteIndex === null) return;
    setExercises((current) =>
      current.map((exercise, i) =>
        i === substituteIndex
          ? {
              name: suggestion.name,
              muscleGroup: suggestion.muscleGroup,
              sets: parseSetsAndReps(suggestion.setsAndReps),
            }
          : exercise,
      ),
    );
    closeSubstitute();
  }

  function addSet(exerciseIndex: number) {
    setExercises((current) =>
      current.map((exercise, i) =>
        i === exerciseIndex ? { ...exercise, sets: [...exercise.sets, { ...blankSet }] } : exercise,
      ),
    );
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setExercises((current) =>
      current.map((exercise, i) =>
        i === exerciseIndex
          ? {
              ...exercise,
              sets:
                exercise.sets.length > 1
                  ? exercise.sets.filter((_, j) => j !== setIndex)
                  : exercise.sets,
            }
          : exercise,
      ),
    );
  }

  const exercisesPayload = exercises
    .filter((exercise) => exercise.name.trim() !== "")
    .map((exercise) => ({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: exercise.sets
        .filter(
          (set) =>
            set.reps.trim() !== "" ||
            set.weightLbs.trim() !== "" ||
            set.durationSeconds.trim() !== "" ||
            set.rpe.trim() !== "",
        )
        .map((set) => ({
          reps: set.reps.trim() === "" ? null : Number(set.reps),
          weightLbs: set.weightLbs.trim() === "" ? null : Number(set.weightLbs),
          durationSeconds: set.durationSeconds.trim() === "" ? null : Number(set.durationSeconds),
          rpe: set.rpe.trim() === "" ? null : Number(set.rpe),
        })),
    }));

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Log a workout</h2>

      <label className="flex flex-col gap-1 text-sm">
        Workout name
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Chest & Triceps"
          className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {state?.errors?.name && <span className="text-danger">{state.errors.name[0]}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        What did you do?
        <div className="flex gap-2">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Bench press 3 sets of 10 at 135, then incline dumbbell press 3x12 at 50s"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {micSupported && (
            <button
              type="button"
              onClick={toggleListening}
              aria-pressed={isListening}
              title={isListening ? "Stop listening" : "Describe by voice"}
              className={`rounded-md border px-3 py-1 text-sm ${
                isListening
                  ? "border-danger text-danger"
                  : "border-border hover:border-accent hover:text-accent"
              }`}
            >
              {isListening ? "● Listening" : "🎤"}
            </button>
          )}
        </div>
        {micError && <span className="text-danger">{micError}</span>}
      </label>

      <button
        type="button"
        onClick={handleEstimate}
        disabled={estimating || !description.trim()}
        className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {estimating ? "Parsing..." : "Estimate workout"}
      </button>

      {estimateResult && "error" in estimateResult && (
        <p className="text-sm text-danger">{estimateResult.error}</p>
      )}

      <div className="flex flex-col gap-3">
        {exercises.map((exercise, exerciseIndex) => (
          <div
            key={exerciseIndex}
            className="flex flex-col gap-2 rounded-md border border-border bg-background p-2"
          >
            <div className="flex gap-2">
              <input
                value={exercise.name}
                onChange={(event) => updateExerciseField(exerciseIndex, "name", event.target.value)}
                placeholder="Exercise name"
                className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={exercise.muscleGroup}
                onChange={(event) =>
                  updateExerciseField(exerciseIndex, "muscleGroup", event.target.value)
                }
                className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {muscleGroupEnum.enumValues.map((group) => (
                  <option key={group} value={group}>
                    {group.replace("_", " ")}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  substituteIndex === exerciseIndex
                    ? closeSubstitute()
                    : openSubstitute(exerciseIndex)
                }
                className="text-xs text-muted-foreground hover:text-accent"
              >
                Substitute
              </button>
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(exerciseIndex)}
                  className="text-xs text-muted-foreground hover:text-danger"
                >
                  Remove
                </button>
              )}
            </div>

            {substituteIndex === exerciseIndex && (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-2">
                <div className="flex gap-2">
                  <input
                    value={substituteNotes}
                    onChange={(event) => setSubstituteNotes(event.target.value)}
                    placeholder={`e.g. a different ${exercise.muscleGroup.replace("_", " ")} exercise, no cables today`}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {substituteMicSupported && (
                    <button
                      type="button"
                      onClick={toggleSubstituteListening}
                      aria-pressed={isSubstituteListening}
                      title={isSubstituteListening ? "Stop listening" : "Describe by voice"}
                      className={`rounded-md border px-3 py-1 text-sm ${
                        isSubstituteListening
                          ? "border-danger text-danger"
                          : "border-border hover:border-accent hover:text-accent"
                      }`}
                    >
                      {isSubstituteListening ? "● Listening" : "🎤"}
                    </button>
                  )}
                </div>
                {substituteMicError && (
                  <span className="text-xs text-danger">{substituteMicError}</span>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGetSubstitutes}
                    disabled={substituting}
                    className="retro-glow rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                  >
                    {substituting ? "Thinking..." : "Get suggestions"}
                  </button>
                  <button
                    type="button"
                    onClick={closeSubstitute}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:border-danger hover:text-danger"
                  >
                    Cancel
                  </button>
                </div>
                {substituteResult && "error" in substituteResult && (
                  <p className="text-xs text-danger">{substituteResult.error}</p>
                )}
                {substituteResult && "suggestions" in substituteResult && (
                  <ul className="flex flex-col gap-2">
                    {substituteResult.suggestions.map((suggestion, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-border bg-background p-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">{suggestion.name}</p>
                          <span className="text-muted-foreground">{suggestion.setsAndReps}</span>
                        </div>
                        <p className="mt-1 text-accent">{suggestion.reason}</p>
                        <button
                          type="button"
                          onClick={() => applySubstitute(suggestion)}
                          className="mt-1 text-muted-foreground hover:text-accent"
                        >
                          Use this
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 px-2 text-xs text-muted-foreground">
              <span>Reps</span>
              <span>Weight (lb)</span>
              <span>Duration (s)</span>
              <span>RPE</span>
            </div>
            {exercise.sets.map((set, setIndex) => (
              <div key={setIndex} className="flex items-center gap-2">
                <div className="grid flex-1 grid-cols-4 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={set.reps}
                    onChange={(event) =>
                      updateSet(exerciseIndex, setIndex, "reps", event.target.value)
                    }
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={set.weightLbs}
                    onChange={(event) =>
                      updateSet(exerciseIndex, setIndex, "weightLbs", event.target.value)
                    }
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    min={0}
                    value={set.durationSeconds}
                    onChange={(event) =>
                      updateSet(exerciseIndex, setIndex, "durationSeconds", event.target.value)
                    }
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={set.rpe}
                    onChange={(event) =>
                      updateSet(exerciseIndex, setIndex, "rpe", event.target.value)
                    }
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {exercise.sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(exerciseIndex, setIndex)}
                    className="text-xs text-muted-foreground hover:text-danger"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addSet(exerciseIndex)}
              className="self-start text-xs text-accent hover:underline"
            >
              + Add set
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addExercise}
          className="self-start text-xs text-accent hover:underline"
        >
          + Add exercise
        </button>
      </div>
      {state?.errors?.exercises && (
        <span className="text-sm text-danger">{state.errors.exercises[0]}</span>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Notes (optional)
        <textarea
          name="notes"
          rows={2}
          placeholder="How it felt, anything to remember for next time..."
          className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <input type="hidden" name="exercises" value={JSON.stringify(exercisesPayload)} />

      <div className="flex gap-3">
        <button
          disabled={pending}
          type="submit"
          className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Logging..." : "Log workout"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={pending}
          className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-danger hover:text-danger disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
