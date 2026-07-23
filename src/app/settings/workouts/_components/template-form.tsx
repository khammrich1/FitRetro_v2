"use client";

import { useState, useTransition } from "react";
import { muscleGroupEnum, type MuscleGroup } from "@/db/schema";
import { useSpeechToText } from "@/lib/hooks/use-speech-to-text";
import {
  saveTemplateAction,
  estimateTemplateAction,
  type EstimateTemplateState,
} from "@/app/workouts/actions";
import type { WorkoutTemplateWithExercises } from "@/features/workouts";

type EditableTemplateExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  targetSetsReps: string;
};

function blankExercise(): EditableTemplateExercise {
  return { name: "", muscleGroup: muscleGroupEnum.enumValues[0], targetSetsReps: "" };
}

export function TemplateForm({
  template,
  onClose,
}: {
  template?: WorkoutTemplateWithExercises;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [exercises, setExercises] = useState<EditableTemplateExercise[]>(
    template && template.exercises.length > 0
      ? template.exercises.map((exercise) => ({
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          targetSetsReps: exercise.targetSetsReps,
        }))
      : [blankExercise()],
  );
  const [description, setDescription] = useState("");
  const [estimateResult, setEstimateResult] = useState<EstimateTemplateState>(undefined);
  const [estimating, startEstimating] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>(undefined);
  const [saving, startSaving] = useTransition();

  const {
    isListening,
    isSupported: micSupported,
    toggleListening,
    error: micError,
  } = useSpeechToText((transcript) => {
    setDescription((current) => (current ? `${current} ${transcript}` : transcript));
  });

  function handleEstimate() {
    startEstimating(async () => {
      const result = await estimateTemplateAction(description);
      setEstimateResult(result);
      if (result && "estimate" in result) {
        setExercises(
          result.estimate.exercises.map((exercise) => ({
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            targetSetsReps: exercise.targetSetsReps,
          })),
        );
      }
    });
  }

  function updateExercise(index: number, field: keyof EditableTemplateExercise, value: string) {
    setExercises((current) =>
      current.map((exercise, i) => (i === index ? { ...exercise, [field]: value } : exercise)),
    );
  }

  function addExercise() {
    setExercises((current) => [...current, blankExercise()]);
  }

  function removeExercise(index: number) {
    setExercises((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set(
      "exercises",
      JSON.stringify(
        exercises.filter(
          (exercise) => exercise.name.trim() !== "" && exercise.targetSetsReps.trim() !== "",
        ),
      ),
    );
    startSaving(async () => {
      const result = await saveTemplateAction(template?.id, undefined, formData);
      if (result?.errors) {
        setErrors(result.errors);
      } else {
        setErrors(undefined);
        onClose();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-border bg-background p-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Template name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Chest & Triceps"
          className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {errors?.name && <span className="text-xs text-danger">{errors.name[0]}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Describe your routine (optional)
        <div className="flex gap-2">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Incline bench 3x10, flat bench 3x8, dips 3x12, then skull crushers 3x12..."
            className="flex-1 rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        {micError && <span className="text-xs text-danger">{micError}</span>}
      </label>

      <button
        type="button"
        onClick={handleEstimate}
        disabled={estimating || !description.trim()}
        className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {estimating ? "Parsing..." : "Fill in from description"}
      </button>

      {estimateResult && "error" in estimateResult && (
        <p className="text-sm text-danger">{estimateResult.error}</p>
      )}

      <div className="flex flex-col gap-2">
        {exercises.map((exercise, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={exercise.name}
              onChange={(event) => updateExercise(index, "name", event.target.value)}
              placeholder="Exercise name"
              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={exercise.muscleGroup}
              onChange={(event) => updateExercise(index, "muscleGroup", event.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {muscleGroupEnum.enumValues.map((group) => (
                <option key={group} value={group}>
                  {group.replace("_", " ")}
                </option>
              ))}
            </select>
            <input
              value={exercise.targetSetsReps}
              onChange={(event) => updateExercise(index, "targetSetsReps", event.target.value)}
              placeholder="3x10"
              className="w-20 rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {exercises.length > 1 && (
              <button
                type="button"
                onClick={() => removeExercise(index)}
                className="text-xs text-muted-foreground hover:text-danger"
              >
                Remove
              </button>
            )}
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
      {errors?.exercises && <span className="text-sm text-danger">{errors.exercises[0]}</span>}

      <div className="flex gap-3">
        <button
          disabled={saving}
          type="submit"
          className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save template"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-danger hover:text-danger disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
