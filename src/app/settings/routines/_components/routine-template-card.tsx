"use client";

import { useActionState, useState, useTransition } from "react";
import type { RoutineWithItems, RoutineItemWithCompletion } from "@/features/routines";
import {
  deleteRoutineAction,
  addRoutineItemAction,
  updateRoutineItemAction,
  deleteRoutineItemAction,
  moveRoutineItemAction,
} from "@/app/routine/actions";

function RoutineTemplateItemRow({
  item,
  isFirst,
  isLast,
}: {
  item: RoutineItemWithCompletion;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("notes", notes);
    startTransition(async () => {
      await updateRoutineItemAction(item.id, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteRoutineItemAction(item.id);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveRoutineItemAction(item.id, direction);
    });
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-md border border-border bg-card p-2 text-sm">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={pending || !name.trim()}
            className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={pending}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1 rounded-md border border-border bg-background p-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex-1">{item.name}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            onClick={() => handleMove("up")}
            disabled={pending || isFirst}
            className="hover:text-accent disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => handleMove("down")}
            disabled={pending || isLast}
            className="hover:text-accent disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <button onClick={() => setEditing(true)} disabled={pending} className="hover:text-accent">
            Edit
          </button>
          <button onClick={handleDelete} disabled={pending} className="hover:text-danger">
            Remove
          </button>
        </div>
      </div>
      {item.notes && <p className="pl-6 text-xs text-muted-foreground">{item.notes}</p>}
    </li>
  );
}

function AddItemForm({ routineId }: { routineId: string }) {
  const [state, action, pending] = useActionState(
    addRoutineItemAction.bind(null, routineId),
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="Add a step..."
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          name="notes"
          placeholder="Notes (optional)"
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          disabled={pending}
          type="submit"
          className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {pending ? "Adding..." : "+ Add"}
        </button>
      </div>
      {state?.errors?.name && <span className="text-xs text-danger">{state.errors.name[0]}</span>}
    </form>
  );
}

export function RoutineTemplateCard({ routine }: { routine: RoutineWithItems }) {
  const [pending, startTransition] = useTransition();

  function handleDeleteRoutine() {
    startTransition(async () => {
      await deleteRoutineAction(routine.id);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          {routine.name}
        </h2>
        <button
          onClick={handleDeleteRoutine}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          Delete routine
        </button>
      </div>

      {routine.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No steps yet — add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {routine.items.map((item, index) => (
            <RoutineTemplateItemRow
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === routine.items.length - 1}
            />
          ))}
        </ul>
      )}

      <AddItemForm routineId={routine.id} />
    </div>
  );
}
