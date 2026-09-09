"use client";

import { useState, useTransition } from "react";
import type { PantryItem } from "@/db/schema";
import { updatePantryItemAction, deletePantryItemAction } from "../actions";
import { MACRO_LABELS, type MacroKey } from "@/lib/macro-order";

function PantryListItem({ item, macroOrder }: { item: PantryItem; macroOrder: MacroKey[] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [trackUnits, setTrackUnits] = useState(item.totalPortions !== null);
  const [totalPortions, setTotalPortions] = useState(String(item.totalPortions ?? ""));
  const [portionsRemaining, setPortionsRemaining] = useState(String(item.portionsRemaining ?? ""));
  const [calories, setCalories] = useState(String(item.caloriesPerPortion ?? ""));
  const [fatGrams, setFatGrams] = useState(String(item.fatGramsPerPortion ?? ""));
  const [carbsGrams, setCarbsGrams] = useState(String(item.carbsGramsPerPortion ?? ""));
  const [proteinGrams, setProteinGrams] = useState(String(item.proteinGramsPerPortion ?? ""));
  const [pending, startTransition] = useTransition();

  const gramValueByKey: Record<MacroKey, [string, (value: string) => void]> = {
    fat: [fatGrams, setFatGrams],
    carbs: [carbsGrams, setCarbsGrams],
    protein: [proteinGrams, setProteinGrams],
  };

  function handleSave() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("quantity", quantity);
    if (trackUnits) {
      formData.set("trackUnits", "on");
      formData.set("totalPortions", totalPortions);
      formData.set("portionsRemaining", portionsRemaining);
      formData.set("calories", calories);
      formData.set("fatGrams", fatGrams);
      formData.set("carbsGrams", carbsGrams);
      formData.set("proteinGrams", proteinGrams);
    }
    startTransition(async () => {
      await updatePantryItemAction(item.id, formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deletePantryItemAction(item.id);
    });
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="quantity"
            className="w-32 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trackUnits}
            onChange={(event) => setTrackUnits(event.target.checked)}
          />
          Track individual units
        </label>

        {trackUnits && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-2">
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                Total units
                <input
                  type="number"
                  min={1}
                  value={totalPortions}
                  onChange={(event) => setTotalPortions(event.target.value)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                Units remaining
                <input
                  type="number"
                  min={0}
                  value={portionsRemaining}
                  onChange={(event) => setPortionsRemaining(event.target.value)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2 px-2 text-xs text-muted-foreground">
              <span>Calories</span>
              {macroOrder.map((key) => (
                <span key={key}>{MACRO_LABELS[key]} (g)</span>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                min={0}
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                placeholder="kcal"
                className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {macroOrder.map((key) => {
                const [value, setValue] = gramValueByKey[key];
                return (
                  <input
                    key={key}
                    type="number"
                    min={0}
                    step="any"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={key}
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                );
              })}
            </div>
          </div>
        )}

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

  const hasMacros = item.caloriesPerPortion !== null;
  const gramsByKey: Record<MacroKey, number> = {
    fat: item.fatGramsPerPortion ?? 0,
    carbs: item.carbsGramsPerPortion ?? 0,
    protein: item.proteinGramsPerPortion ?? 0,
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-border bg-background p-3 text-sm">
      <span className="min-w-0 break-words">
        <span className="font-medium">{item.name}</span>
        {item.totalPortions !== null ? (
          <span className={item.portionsRemaining === 0 ? "text-danger" : "text-muted-foreground"}>
            {" "}
            — {item.portionsRemaining} of {item.totalPortions} left
          </span>
        ) : (
          item.quantity && <span className="text-muted-foreground"> — {item.quantity}</span>
        )}
        {hasMacros && (
          <span className="block text-xs text-accent">
            {item.caloriesPerPortion} kcal ·{" "}
            {macroOrder.map((key) => `${gramsByKey[key].toFixed(1)}g ${key}`).join(" · ")} / unit
          </span>
        )}
      </span>
      <div className="flex shrink-0 items-center gap-3">
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

export function PantryList({ items, macroOrder }: { items: PantryItem[]; macroOrder: MacroKey[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Your pantry is empty — add items below.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <PantryListItem key={item.id} item={item} macroOrder={macroOrder} />
      ))}
    </ul>
  );
}
