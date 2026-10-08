"use client";

import { useActionState, useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RoutineWithItems, RoutineItemWithCompletion } from "@/features/routines";
import {
  deleteRoutineAction,
  addRoutineItemAction,
  updateRoutineItemAction,
  deleteRoutineItemAction,
  reorderRoutineItemsAction,
} from "@/app/routine/actions";

function RoutineTemplateItemRow({
  item,
  isFirst,
  isLast,
  onMove,
}: {
  item: RoutineItemWithCompletion;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
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

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-2 text-sm">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-background p-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 break-words">{item.name}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            onClick={() => onMove("up")}
            disabled={pending || isFirst}
            className="hover:text-accent disabled:opacity-30"
            aria-label={`Move ${item.name} up`}
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={pending || isLast}
            className="hover:text-accent disabled:opacity-30"
            aria-label={`Move ${item.name} down`}
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
    </div>
  );
}

function AddItemForm({ routineId }: { routineId: string }) {
  const [state, action, pending] = useActionState(
    addRoutineItemAction.bind(null, routineId),
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="New step name"
          name="name"
          placeholder="Add a step..."
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          aria-label="New step notes"
          name="notes"
          placeholder="Notes (optional)"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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

function SortableStep({
  item,
  disabled,
  children,
}: {
  item: RoutineItemWithCompletion;
  disabled: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-w-0 items-start gap-1 rounded-md border ${isDragging ? "relative z-10 border-accent bg-card shadow-lg" : "border-transparent"}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Drag ${item.name} to reorder`}
        className="mt-1 min-h-11 min-w-8 touch-none rounded-md text-muted-foreground hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export function RoutineTemplateCard({ routine }: { routine: RoutineWithItems }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dragId = useId();
  const [sourceItems, setSourceItems] = useState(routine.items);
  const [items, setItems] = useState(routine.items);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (sourceItems !== routine.items) {
    setSourceItems(routine.items);
    setItems(routine.items);
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  async function saveOrder(from: number, to: number) {
    if (saving || from < 0 || from === to || to < 0 || to >= items.length) return;
    const before = items;
    const next = arrayMove(items, from, to);
    setItems(next);
    setSaving(true);
    setError("");
    setMessage("Saving step order…");
    try {
      const result = await reorderRoutineItemsAction(
        routine.id,
        before.map((i) => i.id),
        next.map((i) => i.id),
      );
      if (result.error) throw new Error(result.error);
      setMessage(`Moved ${before[from].name} to position ${to + 1} of ${items.length}. Saved.`);
    } catch (err) {
      setItems(before);
      setMessage("");
      setError(err instanceof Error ? err.message : "Could not save order.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    void saveOrder(
      items.findIndex((i) => i.id === active.id),
      items.findIndex((i) => i.id === over.id),
    );
  }

  function handleDeleteRoutine() {
    startTransition(async () => {
      await deleteRoutineAction(routine.id);
    });
  }

  return (
    <fieldset
      disabled={saving || pending}
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
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

      <p role="status" aria-label="Step order" className="text-xs text-muted-foreground">
        {message}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No steps yet — add one below.</p>
      ) : (
        <DndContext
          id={dragId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          onDragCancel={() => setMessage("Reorder cancelled.")}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
              {items.map((item, index) => (
                <SortableStep
                  key={item.id}
                  item={item}
                  disabled={saving || pending || items.length < 2}
                >
                  <RoutineTemplateItemRow
                    item={item}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    onMove={(direction) =>
                      void saveOrder(index, index + (direction === "up" ? -1 : 1))
                    }
                  />
                </SortableStep>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <AddItemForm routineId={routine.id} />
    </fieldset>
  );
}
