"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import {
  createGoalAction,
  updateGoalAction,
  type GoalFormState,
} from "@/app/progress/goals/actions";
import type { Goal } from "@/db/schema";
import { AchievedDateFields, fieldClass } from "./achieved-date-fields";

type EditableGoal = Pick<
  Goal,
  | "id"
  | "title"
  | "notes"
  | "status"
  | "startedOn"
  | "targetDate"
  | "achievedOn"
  | "achievedPrecision"
>;

/** Add a goal (or log an already-achieved milestone), or edit an existing one. Submitted via
 * onSubmit + a transition rather than <form action>, so a validation error never wipes what the
 * user typed (React 19 resets uncontrolled forms after a form action). */
export function GoalForm({
  todayIso,
  goal,
  onSaved,
  onCancel,
}: {
  todayIso: string;
  /** Present when editing. */
  goal?: EditableGoal;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const action = goal ? updateGoalAction.bind(null, goal.id) : createGoalAction;
  const [state, formAction, pending] = useActionState<GoalFormState, FormData>(action, undefined);
  const [achieved, setAchieved] = useState(goal?.status === "achieved");
  // Bumped after each successful add; keys the form so its fields remount empty.
  const [resetKey, setResetKey] = useState(0);
  const [handledSave, setHandledSave] = useState(state?.savedAt);

  if (state?.savedAt !== handledSave) {
    setHandledSave(state?.savedAt);
    if (state?.savedAt && !goal) {
      setResetKey((key) => key + 1);
      setAchieved(false);
    }
  }

  useEffect(() => {
    if (state?.savedAt) onSaved?.();
  }, [state?.savedAt, onSaved]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state?.errors;
  const idPrefix = goal ? `goal-${goal.id}` : "new-goal";

  return (
    <form key={resetKey} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Goal</span>
        <input
          name="title"
          defaultValue={goal?.title}
          placeholder="e.g. Do a muscle up"
          maxLength={120}
          required
          className={fieldClass}
        />
        {errors?.title && <span className="text-danger">{errors.title[0]}</span>}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="achieved"
          checked={achieved}
          onChange={(event) => setAchieved(event.target.checked)}
        />
        {goal ? "Achieved 🏆" : "I've already done it 🏆"}
      </label>

      {achieved && (
        <AchievedDateFields
          todayIso={todayIso}
          defaultPrecision={goal?.achievedPrecision ?? "day"}
          defaultDate={goal?.achievedOn}
          error={errors?.achieved?.[0]}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-started`}>
          <span className="font-medium">
            {achieved ? "Working on it since" : "Started"}{" "}
            {achieved && <span className="font-normal text-muted-foreground">(optional)</span>}
          </span>
          <input
            // Remounts when "already done" is toggled on a new goal, so the default follows it:
            // today for a new goal, blank for a past milestone (else "since today" would sit
            // after an achievement date in the past).
            key={goal ? "edit" : achieved ? "milestone" : "goal"}
            id={`${idPrefix}-started`}
            type="date"
            name="startedOn"
            defaultValue={goal ? (goal.startedOn ?? "") : achieved ? "" : todayIso}
            max={todayIso}
            className={fieldClass}
          />
          {errors?.startedOn && <span className="text-danger">{errors.startedOn[0]}</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-target`}>
          <span className="font-medium">
            Target date <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <input
            id={`${idPrefix}-target`}
            type="date"
            name="targetDate"
            defaultValue={goal?.targetDate ?? ""}
            className={fieldClass}
          />
          {errors?.targetDate && <span className="text-danger">{errors.targetDate[0]}</span>}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <textarea
          name="notes"
          defaultValue={goal?.notes ?? ""}
          rows={2}
          maxLength={1000}
          placeholder={achieved ? "How it felt, what got you there…" : "Why it matters, the plan…"}
          className={fieldClass}
        />
        {errors?.notes && <span className="text-danger">{errors.notes[0]}</span>}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : goal ? "Save" : achieved ? "Log milestone" : "Add goal"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
        <span role="status" className="text-sm">
          {state?.error && <span className="text-danger">{state.error}</span>}
          {state?.ok && !pending && !goal && <span className="text-accent">{state.ok}</span>}
        </span>
      </div>
    </form>
  );
}
