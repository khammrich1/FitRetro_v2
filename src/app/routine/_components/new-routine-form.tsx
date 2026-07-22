"use client";

import { useActionState } from "react";
import { createRoutineAction } from "../actions";

export function NewRoutineForm() {
  const [state, action, pending] = useActionState(createRoutineAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">New routine</h2>
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="Morning Routine, Evening Wind-down..."
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          disabled={pending}
          type="submit"
          className="retro-glow rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
      {state?.errors?.name && <span className="text-xs text-danger">{state.errors.name[0]}</span>}
    </form>
  );
}
