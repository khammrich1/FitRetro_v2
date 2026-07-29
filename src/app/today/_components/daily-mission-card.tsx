"use client";

import { useActionState, useState, useTransition } from "react";
import type { DailyMissionEntry } from "@/db/schema";
import {
  addMissionEntryAction,
  updateMissionEntryAction,
  deleteMissionEntryAction,
  moveMissionEntryAction,
  toggleMissionEntryCompletionAction,
} from "@/app/daily-mission/actions";

function MissionEntryRow({
  entry,
  dayIso,
  isFirst,
  isLast,
}: {
  entry: DailyMissionEntry;
  dayIso: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleMissionEntryCompletionAction(entry.id);
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await updateMissionEntryAction(entry.id, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteMissionEntryAction(entry.id);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveMissionEntryAction(entry.id, dayIso, direction);
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-sm"
      >
        <input
          name="label"
          defaultValue={entry.label}
          autoFocus
          className="flex-1 rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          disabled={pending}
          type="submit"
          className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <li className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-sm">
      <input
        type="checkbox"
        checked={entry.completed}
        onChange={handleToggle}
        disabled={pending}
        className="h-4 w-4 accent-primary"
      />
      <span className={entry.completed ? "flex-1 text-muted-foreground line-through" : "flex-1"}>
        {entry.label}
      </span>
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
    </li>
  );
}

function AddMissionEntryForm({ dayIso }: { dayIso: string }) {
  const addAction = addMissionEntryAction.bind(null, dayIso);
  const [state, action, pending] = useActionState(addAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          name="label"
          placeholder="Add something that makes today a win..."
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          disabled={pending}
          type="submit"
          className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Adding..." : "+ Add"}
        </button>
      </div>
      {state?.errors?.label && <span className="text-xs text-danger">{state.errors.label[0]}</span>}
    </form>
  );
}

export function DailyMissionCard({
  entries,
  dayIso,
}: {
  entries: DailyMissionEntry[];
  dayIso: string;
}) {
  const completedCount = entries.filter((entry) => entry.completed).length;

  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-accent bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Today&apos;s mission
        </h2>
        {entries.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{entries.length}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          What would make today a win? Add the things that matter for this specific day below.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <MissionEntryRow
              key={entry.id}
              entry={entry}
              dayIso={dayIso}
              isFirst={index === 0}
              isLast={index === entries.length - 1}
            />
          ))}
        </ul>
      )}

      <AddMissionEntryForm dayIso={dayIso} />
    </div>
  );
}
