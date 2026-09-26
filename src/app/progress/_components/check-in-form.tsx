"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { saveCheckInAction, type CheckInState } from "@/app/progress/actions";
import { shrinkImageForUpload } from "@/lib/shrink-image";
import { PROGRESS_POSES as POSES } from "@/features/progress-photos/check-ins";
import type { ProgressPhotoPose } from "@/db/schema";

type Picked = { file: File; previewUrl: string };

const inputClass =
  "w-full rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Last time's photo of each pose (id + day label), shown faded in the matching empty slot. */
export type PoseReferences = Partial<Record<ProgressPhotoPose, { id: string; label: string }>>;

export function CheckInForm({
  todayIso,
  references = {},
}: {
  todayIso: string;
  references?: PoseReferences;
}) {
  const [state, formAction, pending] = useActionState<CheckInState, FormData>(
    saveCheckInAction,
    undefined,
  );
  const [picked, setPicked] = useState<Partial<Record<ProgressPhotoPose, Picked>>>({});
  const [preparing, setPreparing] = useState(false);
  const inputRefs = useRef<Partial<Record<ProgressPhotoPose, HTMLInputElement | null>>>({});
  // Bumped after each successful save; keys the measurement fields so they remount empty.
  const [savedCount, setSavedCount] = useState(0);
  const [handledState, setHandledState] = useState(state);

  // After a successful save, clear the slots and measurements for the next check-in. Adjusting
  // state during render (rather than in an effect) is React's recommended pattern for this.
  if (state !== handledState) {
    setHandledState(state);
    if (state?.ok) {
      setPicked({});
      setSavedCount((count) => count + 1);
    }
  }

  function pick(pose: ProgressPhotoPose, file: File | undefined) {
    setPicked((current) => {
      const previous = current[pose];
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      if (!file) {
        const next = { ...current };
        delete next[pose];
        return next;
      }
      return { ...current, [pose]: { file, previewUrl: URL.createObjectURL(file) } };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData();
    for (const name of ["takenOn", "weightLbs", "waistIn", "bodyFatPercent"]) {
      const input = form.elements.namedItem(name) as HTMLInputElement | null;
      formData.set(name, input?.value ?? "");
    }
    setPreparing(true);
    try {
      for (const { pose } of POSES) {
        const choice = picked[pose];
        if (choice) formData.set(pose, await shrinkImageForUpload(choice.file));
      }
    } finally {
      setPreparing(false);
    }
    startTransition(() => formAction(formData));
  }

  const busy = pending || preparing;
  const photoCount = Object.keys(picked).length;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">New check-in</h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Date</span>
        <input
          type="date"
          name="takenOn"
          defaultValue={todayIso}
          max={todayIso}
          required
          className={`${inputClass} self-start`}
        />
        {state?.errors?.takenOn && <span className="text-danger">{state.errors.takenOn[0]}</span>}
      </label>

      <div className="grid grid-cols-3 gap-2">
        {POSES.map(({ pose, label }) => {
          const choice = picked[pose];
          return (
            <div key={pose} className="flex min-w-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => inputRefs.current[pose]?.click()}
                aria-label={
                  choice
                    ? `Change ${label.toLowerCase()} photo`
                    : `Add ${label.toLowerCase()} photo`
                }
                className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-accent hover:text-accent"
              >
                {choice ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={choice.previewUrl}
                    alt={`${label} photo preview`}
                    className="h-full w-full object-cover"
                  />
                ) : references[pose] ? (
                  // Last time's shot, faded, so the new one can match stance and framing.
                  <span className="relative block h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/progress/photos/${references[pose].id}?size=thumb`}
                      alt=""
                      className="h-full w-full object-cover opacity-30"
                    />
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center">
                      <span className="font-medium text-foreground">+ {label}</span>
                      <span className="rounded bg-background/80 px-1 text-[10px] leading-tight">
                        Last: {references[pose].label}
                      </span>
                    </span>
                  </span>
                ) : (
                  <span>+ {label}</span>
                )}
              </button>
              <input
                ref={(element) => {
                  inputRefs.current[pose] = element;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                data-pose={pose}
                onChange={(event) => {
                  pick(pose, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{label}</span>
                {choice && (
                  <button
                    type="button"
                    onClick={() => pick(pose, undefined)}
                    className="text-muted-foreground hover:text-danger"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <fieldset key={savedCount} className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          Measurements <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            Weight (lb)
            <input
              type="number"
              name="weightLbs"
              inputMode="decimal"
              step="0.1"
              min="0"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Waist (in)
            <input
              type="number"
              name="waistIn"
              inputMode="decimal"
              step="0.1"
              min="0"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Body fat (%)
            <input
              type="number"
              name="bodyFatPercent"
              inputMode="decimal"
              step="0.1"
              min="0"
              className={inputClass}
            />
          </label>
        </div>
        {(state?.errors?.weightLbs || state?.errors?.waistIn || state?.errors?.bodyFatPercent) && (
          <span className="text-sm text-danger">
            {state.errors.weightLbs?.[0] ??
              state.errors.waistIn?.[0] ??
              state.errors.bodyFatPercent?.[0]}
          </span>
        )}
      </fieldset>

      <p className="text-xs text-muted-foreground">
        Same spot, same lighting, same time of day makes changes easiest to see. Every photo is kept
        — retake as often as you like and nothing is replaced.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || photoCount === 0}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {preparing ? "Preparing photos..." : pending ? "Saving..." : "Save check-in"}
        </button>
        <span role="status" className="text-sm">
          {state?.error && <span className="text-danger">{state.error}</span>}
          {state?.ok && !busy && <span className="text-accent">{state.ok}</span>}
        </span>
      </div>
    </form>
  );
}
