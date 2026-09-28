"use client";

import { startTransition, useActionState, useCallback, useState, useTransition } from "react";
import {
  achieveGoalAction,
  deleteGoalAction,
  type GoalFormState,
} from "@/app/progress/goals/actions";
import type { Goal } from "@/db/schema";
import { AchievedDateFields } from "./achieved-date-fields";
import { GoalForm } from "./goal-form";

/** Display strings are computed on the server (page.tsx) so they never depend on the browser's
 * clock or time zone; the card only lays them out. */
export type GoalCardData = Pick<
  Goal,
  | "id"
  | "title"
  | "notes"
  | "status"
  | "startedOn"
  | "targetDate"
  | "achievedOn"
  | "achievedPrecision"
> & {
  /** Active: "Day 269 · since Jan 1, 2026". Milestone: "Achieved March 2026". */
  headline: string;
  /** Active: target status. Milestone: "Goal since Jan 1, 2026 · took about 2 months". */
  detail: string | null;
  overdue?: boolean;
};

function DeleteButton({ goalId, noun }: { goalId: string; noun: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startDelete] = useTransition();
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-muted-foreground hover:text-danger"
      >
        Delete
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Delete this {noun}?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startDelete(() => deleteGoalAction(goalId))}
        className="font-medium text-danger disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-muted-foreground hover:text-foreground"
      >
        Keep
      </button>
    </span>
  );
}

function AchieveForm({
  goalId,
  todayIso,
  onCancel,
}: {
  goalId: string;
  todayIso: string;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<GoalFormState, FormData>(
    achieveGoalAction.bind(null, goalId),
    undefined,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-accent/40 p-3"
    >
      <AchievedDateFields todayIso={todayIso} error={state?.errors?.achieved?.[0]} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save milestone 🏆"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

export function GoalCard({ goal, todayIso }: { goal: GoalCardData; todayIso: string }) {
  const [mode, setMode] = useState<"view" | "edit" | "achieve">("view");
  const close = useCallback(() => setMode("view"), []);

  if (mode === "edit") {
    return (
      <article className="rounded-lg border border-border bg-card p-4">
        <GoalForm todayIso={todayIso} goal={goal} onSaved={close} onCancel={close} />
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold text-foreground">{goal.title}</h3>
      <p className="text-sm text-muted-foreground">{goal.headline}</p>
      {goal.detail && (
        <p className={`text-sm ${goal.overdue ? "text-danger" : "text-accent"}`}>{goal.detail}</p>
      )}
      {goal.notes && <p className="whitespace-pre-line text-sm">{goal.notes}</p>}
      {mode === "achieve" ? (
        <AchieveForm goalId={goal.id} todayIso={todayIso} onCancel={close} />
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <button
            type="button"
            onClick={() => setMode("achieve")}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            I did it! 🏆
          </button>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
          <DeleteButton goalId={goal.id} noun="goal" />
        </div>
      )}
    </article>
  );
}

export function MilestoneCard({ goal, todayIso }: { goal: GoalCardData; todayIso: string }) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  if (editing) {
    return (
      <article className="rounded-lg border border-border bg-card p-4">
        <GoalForm todayIso={todayIso} goal={goal} onSaved={close} onCancel={close} />
      </article>
    );
  }

  return (
    <article className="flex gap-3 rounded-lg border border-accent/40 bg-card p-4">
      <span aria-hidden className="text-2xl leading-none">
        🏆
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="font-semibold text-foreground">{goal.title}</h3>
        <p className="text-sm font-medium text-accent">{goal.headline}</p>
        {goal.detail && <p className="text-sm text-muted-foreground">{goal.detail}</p>}
        {goal.notes && <p className="whitespace-pre-line text-sm">{goal.notes}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
          <DeleteButton goalId={goal.id} noun="milestone" />
        </div>
      </div>
    </article>
  );
}
