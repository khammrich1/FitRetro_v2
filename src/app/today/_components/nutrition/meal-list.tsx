"use client";

import { useState, useTransition } from "react";
import { mealTypeEnum } from "@/db/schema";
import type { NutritionEntryWithItems } from "@/features/nutrition";
import { updateMealAction, deleteMealAction } from "@/app/nutrition/actions";
import { blankItem, type EditableItem } from "./meal-form";
import { capitalize } from "@/lib/strings";

function MealListItem({ entry }: { entry: NutritionEntryWithItems }) {
  const [editing, setEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [mealType, setMealType] = useState(entry.mealType);
  const [description, setDescription] = useState(entry.description);
  const hasItems = entry.items.length > 0;
  const [items, setItems] = useState<EditableItem[]>(
    entry.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      calories: String(item.calories),
      proteinGrams: String(item.proteinGrams),
      carbsGrams: String(item.carbsGrams),
      fatGrams: String(item.fatGrams),
    })),
  );
  const [calories, setCalories] = useState(String(entry.calories));
  const [proteinGrams, setProteinGrams] = useState(String(entry.proteinGrams));
  const [carbsGrams, setCarbsGrams] = useState(String(entry.carbsGrams));
  const [fatGrams, setFatGrams] = useState(String(entry.fatGrams));
  const [pending, startTransition] = useTransition();

  const itemTotals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      proteinGrams: acc.proteinGrams + (Number(item.proteinGrams) || 0),
      carbsGrams: acc.carbsGrams + (Number(item.carbsGrams) || 0),
      fatGrams: acc.fatGrams + (Number(item.fatGrams) || 0),
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );

  function updateItem(index: number, field: keyof EditableItem, value: string) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((current) => [...current, { ...blankItem }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("mealType", mealType);
    formData.set("description", description);
    if (hasItems) {
      formData.set("calories", String(Math.round(itemTotals.calories)));
      formData.set("proteinGrams", itemTotals.proteinGrams.toFixed(2));
      formData.set("carbsGrams", itemTotals.carbsGrams.toFixed(2));
      formData.set("fatGrams", itemTotals.fatGrams.toFixed(2));
      formData.set("items", JSON.stringify(items.filter((item) => item.name.trim() !== "")));
    } else {
      formData.set("calories", calories);
      formData.set("proteinGrams", proteinGrams);
      formData.set("carbsGrams", carbsGrams);
      formData.set("fatGrams", fatGrams);
    }
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
                {capitalize(type)}
              </option>
            ))}
          </select>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {hasItems ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-2 px-2 text-xs text-muted-foreground">
              <span>Calories</span>
              <span>Protein (g)</span>
              <span>Carbs (g)</span>
              <span>Fat (g)</span>
            </div>
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-md border border-border bg-background p-2"
              >
                <div className="flex gap-2">
                  <input
                    value={item.name}
                    onChange={(event) => updateItem(index, "name", event.target.value)}
                    placeholder="Item name"
                    className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-xs text-muted-foreground hover:text-danger"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={item.calories}
                    onChange={(event) => updateItem(index, "calories", event.target.value)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={item.proteinGrams}
                    onChange={(event) => updateItem(index, "proteinGrams", event.target.value)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={item.carbsGrams}
                    onChange={(event) => updateItem(index, "carbsGrams", event.target.value)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={item.fatGrams}
                    onChange={(event) => updateItem(index, "fatGrams", event.target.value)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="self-start text-xs text-accent hover:underline"
            >
              + Add item
            </button>
            <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
              <span className="font-medium">Total</span>
              <span className="text-muted-foreground">
                {Math.round(itemTotals.calories)} kcal · {itemTotals.proteinGrams.toFixed(1)}g
                protein · {itemTotals.carbsGrams.toFixed(1)}g carbs ·{" "}
                {itemTotals.fatGrams.toFixed(1)}g fat
              </span>
            </div>
          </div>
        ) : (
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
        )}
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
    <li className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 break-words">
          <span className="font-medium capitalize">{entry.mealType}</span> — {entry.description}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          {entry.items.length > 0 && (
            <button
              onClick={() => setShowDetails((current) => !current)}
              disabled={pending}
              className="text-xs text-muted-foreground hover:text-accent"
            >
              {showDetails ? "Hide details" : "Details"}
            </button>
          )}
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
      </div>
      <div className="text-xs text-muted-foreground">
        {entry.calories} kcal · {entry.proteinGrams}g protein · {entry.carbsGrams}g carbs ·{" "}
        {entry.fatGrams}g fat
      </div>

      {showDetails && entry.items.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border pt-2 text-xs text-muted-foreground">
          {entry.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <span>
                {item.quantity} {item.name}
              </span>
              <span>
                {item.calories} kcal · {item.proteinGrams}g protein · {item.carbsGrams}g carbs ·{" "}
                {item.fatGrams}g fat
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function MealList({ entries }: { entries: NutritionEntryWithItems[] }) {
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
