"use client";

import { useState, useTransition } from "react";
import { deleteTemplateAction, moveTemplateAction } from "@/app/workouts/actions";
import { TemplateForm } from "./template-form";
import type { WorkoutTemplateWithExercises } from "@/features/workouts";

function TemplateCard({
  template,
  isFirst,
  isLast,
  onEdit,
}: {
  template: WorkoutTemplateWithExercises;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteTemplateAction(template.id);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveTemplateAction(template.id, direction);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{template.name}</span>
        <div className="flex gap-3 text-xs">
          <button
            onClick={() => handleMove("up")}
            disabled={pending || isFirst}
            className="text-muted-foreground hover:text-accent disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={() => handleMove("down")}
            disabled={pending || isLast}
            className="text-muted-foreground hover:text-accent disabled:opacity-30"
          >
            ↓
          </button>
          <button onClick={onEdit} className="text-muted-foreground hover:text-accent">
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-muted-foreground hover:text-danger"
          >
            Delete
          </button>
        </div>
      </div>
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {template.exercises.map((exercise) => (
          <li key={exercise.id}>
            {exercise.name} ({exercise.muscleGroup.replace("_", " ")}): {exercise.targetSetsReps}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TemplatesSection({ templates }: { templates: WorkoutTemplateWithExercises[] }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Workout templates
        </h2>
        {editingId !== "new" && (
          <button
            onClick={() => setEditingId("new")}
            className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent"
          >
            + New template
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Build your standing routines here (e.g. Chest &amp; Tris, warm-up), then start one from the
        Today page — it saves right away and autosaves as you fill in sets, so refreshing
        mid-workout won&apos;t lose anything.
      </p>

      {editingId === "new" && <TemplateForm onClose={() => setEditingId(null)} />}

      {templates.length === 0 && editingId !== "new" ? (
        <p className="text-sm text-muted-foreground">No templates yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((template, index) =>
            editingId === template.id ? (
              <TemplateForm
                key={template.id}
                template={template}
                onClose={() => setEditingId(null)}
              />
            ) : (
              <TemplateCard
                key={template.id}
                template={template}
                isFirst={index === 0}
                isLast={index === templates.length - 1}
                onEdit={() => setEditingId(template.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
