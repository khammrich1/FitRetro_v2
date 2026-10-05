"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setWaterIntakeAction } from "@/app/water/actions";

const MAX_OUNCES = 300;
const STEP = 4;
const COMMIT_DELAY_MS = 400;
const QUICK_ADD_AMOUNTS = [8, 16, 32];

export function WaterTracker({
  dayIso,
  initialOunces,
  goalOunces,
}: {
  dayIso: string;
  initialOunces: number;
  goalOunces: number;
}) {
  const [ounces, setOunces] = useState(initialOunces);
  const [failed, setFailed] = useState(false);
  const ouncesRef = useRef(ounces);
  const savedRef = useRef(initialOunces);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef<number | null>(null);

  // Saves are absolute ("ounces today = 48"), so they must land in order: one request at a time,
  // with only the newest value waiting behind it. Without this, a slow earlier save could
  // overwrite a later one.
  const runSaves = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      while (queuedRef.current !== null) {
        const value = queuedRef.current;
        queuedRef.current = null;
        try {
          await setWaterIntakeAction(dayIso, value);
          savedRef.current = value;
          setFailed(false);
        } catch {
          queuedRef.current ??= value;
          setFailed(true);
          break;
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [dayIso]);

  function commit(value: number) {
    queuedRef.current = value;
    void runSaves();
  }

  // Leaving the page (or the day) mid-drag: send whatever the debounce was still holding.
  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (ouncesRef.current !== savedRef.current) {
        queuedRef.current = ouncesRef.current;
        void runSaves();
      }
    },
    [runSaves],
  );

  function handleSliderChange(value: number) {
    ouncesRef.current = value;
    setOunces(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      commit(value);
    }, COMMIT_DELAY_MS);
  }

  function handleQuickAdd(amount: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const value = Math.min(MAX_OUNCES, ouncesRef.current + amount);
    ouncesRef.current = value;
    setOunces(value);
    commit(value);
  }

  const goalPercent = Math.min(100, (goalOunces / MAX_OUNCES) * 100);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Water</h2>
        <span className="text-sm text-muted-foreground">
          {ounces} / {goalOunces} oz
        </span>
      </div>

      <div className="relative flex items-center py-2">
        <input
          type="range"
          min={0}
          max={MAX_OUNCES}
          step={STEP}
          value={ounces}
          onChange={(event) => handleSliderChange(Number(event.target.value))}
          className="w-full accent-primary"
          aria-label="Water intake in ounces"
        />
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-blue-400"
          style={{ left: `${goalPercent}%` }}
          title={`Goal: ${goalOunces}oz`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_ADD_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleQuickAdd(amount)}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:border-primary"
          >
            +{amount} oz
          </button>
        ))}
        {failed && (
          <span role="status" className="text-xs text-danger">
            Couldn&apos;t save — will retry on your next change.
          </span>
        )}
      </div>
    </div>
  );
}
