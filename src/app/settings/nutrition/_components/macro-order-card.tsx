"use client";

import { useState, useTransition } from "react";
import { setMacroOrderAction } from "@/app/nutrition/actions";
import { MACRO_LABELS, type MacroKey } from "@/lib/macro-order";

export function MacroOrderCard({ initialOrder }: { initialOrder: MacroKey[] }) {
  const [order, setOrder] = useState(initialOrder);
  const [pending, startTransition] = useTransition();

  function move(index: number, direction: "up" | "down") {
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= order.length) return;

    const next = [...order];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setOrder(next);
    startTransition(async () => {
      await setMacroOrderAction(next);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
        Macro display order
      </h2>
      <p className="text-xs text-muted-foreground">
        Controls the order fat/carbs/protein appear everywhere they&apos;re shown — meal logging,
        templates, meal prep, pantry, and the targets above. Defaults to nutrition-label order.
      </p>
      <ul className="flex flex-col gap-2">
        {order.map((key, index) => (
          <li
            key={key}
            className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <span>{MACRO_LABELS[key]}</span>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => move(index, "up")}
                disabled={pending || index === 0}
                className="text-muted-foreground hover:text-accent disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, "down")}
                disabled={pending || index === order.length - 1}
                className="text-muted-foreground hover:text-accent disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
