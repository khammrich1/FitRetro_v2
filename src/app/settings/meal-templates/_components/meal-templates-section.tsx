"use client";

import { useState, useTransition } from "react";
import { deleteMealTemplateAction, moveMealTemplateAction } from "@/app/nutrition/actions";
import { MealTemplateForm } from "./meal-template-form";
import type { MealTemplateWithItems } from "@/features/nutrition";

function TemplateCard({
  template,
  isFirst,
  isLast,
  onEdit,
}: {
  template: MealTemplateWithItems;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const totals = template.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinGrams: acc.proteinGrams + item.proteinGrams,
      carbsGrams: acc.carbsGrams + item.carbsGrams,
      fatGrams: acc.fatGrams + item.fatGrams,
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );

  function handleDelete() {
    startTransition(async () => {
      await deleteMealTemplateAction(template.id);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveMealTemplateAction(template.id, direction);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {template.name}{" "}
          <span className="text-xs font-normal capitalize text-muted-foreground">
            ({template.mealType})
          </span>
        </span>
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
        {template.items.map((item) => (
          <li key={item.id}>
            {item.name} ({item.quantity}): {item.calories} kcal
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Total: {Math.round(totals.calories)} kcal · {totals.proteinGrams.toFixed(1)}g protein ·{" "}
        {totals.carbsGrams.toFixed(1)}g carbs · {totals.fatGrams.toFixed(1)}g fat
      </p>
    </div>
  );
}

export function MealTemplatesSection({ templates }: { templates: MealTemplateWithItems[] }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Meal templates
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
        Save meals you eat often (e.g. your usual breakfast) with their macros pre-computed, so
        logging them on Today is a single tap instead of estimating from scratch every time.
      </p>

      {editingId === "new" && <MealTemplateForm onClose={() => setEditingId(null)} />}

      {templates.length === 0 && editingId !== "new" ? (
        <p className="text-sm text-muted-foreground">No meal templates yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((template, index) =>
            editingId === template.id ? (
              <MealTemplateForm
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
