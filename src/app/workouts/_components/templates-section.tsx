"use client";

import { useState, useTransition } from "react";
import { deleteTemplateAction } from "../actions";
import { TemplateForm } from "./template-form";
import type { WorkoutTemplateWithExercises } from "@/features/workouts";

function TemplateCard({
  template,
  onEdit,
}: {
  template: WorkoutTemplateWithExercises;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteTemplateAction(template.id);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{template.name}</span>
        <div className="flex gap-3 text-xs">
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
        Build your standing routines here (e.g. Chest &amp; Tris, warm-up), then load one into
        today&apos;s log below and swap anything you need for that day.
      </p>

      {editingId === "new" && <TemplateForm onClose={() => setEditingId(null)} />}

      {templates.length === 0 && editingId !== "new" ? (
        <p className="text-sm text-muted-foreground">No templates yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((template) =>
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
                onEdit={() => setEditingId(template.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
