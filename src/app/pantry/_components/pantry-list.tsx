"use client";

import { useState, useTransition } from "react";
import type { PantryItem } from "@/db/schema";
import { updatePantryItemAction, deletePantryItemAction } from "../actions";

function PantryListItem({ item }: { item: PantryItem }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("quantity", quantity);
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
      <li className="flex items-center gap-2 rounded-md border border-border bg-background p-3 text-sm">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="flex-1 rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="quantity"
          className="w-32 rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
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
      </li>
    );
  }

  const hasMacros = item.caloriesPerPortion !== null;

  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm">
      <span>
        <span className="font-medium">{item.name}</span>
        {item.quantity && <span className="text-muted-foreground"> — {item.quantity}</span>}
        {hasMacros && (
          <span className="block text-xs text-accent">
            {item.caloriesPerPortion} kcal · {(item.proteinGramsPerPortion ?? 0).toFixed(1)}g
            protein · {(item.carbsGramsPerPortion ?? 0).toFixed(1)}g carbs ·{" "}
            {(item.fatGramsPerPortion ?? 0).toFixed(1)}g fat / portion
          </span>
        )}
      </span>
      <div className="flex items-center gap-3">
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

export function PantryList({ items }: { items: PantryItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Your pantry is empty — add items below.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <PantryListItem key={item.id} item={item} />
      ))}
    </ul>
  );
}
