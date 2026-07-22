"use client";

import { useState, useTransition } from "react";
import { mealTypeEnum, type NutritionEntry } from "@/db/schema";
import { updateMealAction, deleteMealAction } from "../actions";

function MealListItem({ entry }: { entry: NutritionEntry }) {
  const [editing, setEditing] = useState(false);
  const [mealType, setMealType] = useState(entry.mealType);
  const [description, setDescription] = useState(entry.description);
  const [calories, setCalories] = useState(String(entry.calories));
  const [proteinGrams, setProteinGrams] = useState(String(entry.proteinGrams));
  const [carbsGrams, setCarbsGrams] = useState(String(entry.carbsGrams));
  const [fatGrams, setFatGrams] = useState(String(entry.fatGrams));
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set("mealType", mealType);
    formData.set("description", description);
    formData.set("calories", calories);
    formData.set("proteinGrams", proteinGrams);
    formData.set("carbsGrams", carbsGrams);
    formData.set("fatGrams", fatGrams);
    startTransition(async () => {
      await updateMealAction(entry.id, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteMealAction(entry.id);
    });
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
        <div className="flex gap-2">
          <select
            value={mealType}
            onChange={(event) => setMealType(event.target.value as typeof mealType)}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {mealTypeEnum.enumValues.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <input
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            type="number"
            min={0}
            placeholder="kcal"
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={proteinGrams}
            onChange={(event) => setProteinGrams(event.target.value)}
            type="number"
            min={0}
            step="any"
            placeholder="protein"
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={carbsGrams}
            onChange={(event) => setCarbsGrams(event.target.value)}
            type="number"
            min={0}
            step="any"
            placeholder="carbs"
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={fatGrams}
            onChange={(event) => setFatGrams(event.target.value)}
            type="number"
            min={0}
            step="any"
            placeholder="fat"
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={pending || !description.trim()}
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
    <li className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
      <span>
        <span className="font-medium capitalize">{entry.mealType}</span> — {entry.description}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{entry.calories} kcal</span>
        <button
          onClick={() => setEditing(true)}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-accent"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

export function MealList({ entries }: { entries: NutritionEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No meals logged yet for this day.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <MealListItem key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}
