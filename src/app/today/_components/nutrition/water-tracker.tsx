"use client";

import { useRef, useState, useTransition } from "react";
import { setWaterIntakeAction } from "@/app/water/actions";

const MAX_OUNCES = 300;
const STEP = 4;
const COMMIT_DELAY_MS = 400;

export function WaterTracker({ dayIso, initialOunces }: { dayIso: string; initialOunces: number }) {
  const [ounces, setOunces] = useState(initialOunces);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: number) {
    setOunces(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        await setWaterIntakeAction(dayIso, value);
      });
    }, COMMIT_DELAY_MS);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Water</h2>
        <span className="text-sm text-muted-foreground">{ounces} oz</span>
      </div>
      <input
        type="range"
        min={0}
        max={MAX_OUNCES}
        step={STEP}
        value={ounces}
        onChange={(event) => handleChange(Number(event.target.value))}
        className="w-full accent-primary"
        aria-label="Water intake in ounces"
      />
    </div>
  );
}
