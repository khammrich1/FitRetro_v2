"use client";

import { useActionState, useState, useTransition } from "react";
import type { DailyMissionItem } from "@/db/schema";
import {
  addMissionItemAction,
  updateMissionItemAction,
  deleteMissionItemAction,
  moveMissionItemAction,
} from "@/app/daily-mission/actions";

function MissionItemRow({
  item,
  isFirst,
  isLast,
}: {
  item: DailyMissionItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await updateMissionItemAction(item.id, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteMissionItemAction(item.id);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveMissionItemAction(item.id, direction);
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-md border border-border bg-background p-3 text-sm"
      >
        <input
          name="label"
          defaultValue={item.label}
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
    <li className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm">
      <span className="font-medium">{item.label}</span>
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

function AddMissionItemForm() {
  const [state, action, pending] = useActionState(addMissionItemAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm"
    >
      <input
        name="label"
        placeholder="e.g. Work on the deck"
        className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {state?.errors?.label && <span className="text-xs text-danger">{state.errors.label[0]}</span>}
      <button
        disabled={pending}
        type="submit"
        className="self-start rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Adding..." : "+ Add item"}
      </button>
    </form>
  );
}

export function MissionList({ items }: { items: DailyMissionItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mission items yet — add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <MissionItemRow
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === items.length - 1}
            />
          ))}
        </ul>
      )}
      <AddMissionItemForm />
    </div>
  );
}
