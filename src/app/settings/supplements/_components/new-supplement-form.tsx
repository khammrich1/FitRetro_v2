"use client";

import { useActionState } from "react";
import { supplementDoseUnitEnum, supplementFrequencyEnum } from "@/db/schema";
import { createSupplementTemplateAction } from "@/app/supplements/actions";

export function NewSupplementForm() {
  const [state, action, pending] = useActionState(createSupplementTemplateAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">New supplement</h2>
      <input
        name="name"
        placeholder="Supplement name"
        className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {state?.errors?.name && <span className="text-xs text-danger">{state.errors.name[0]}</span>}
      <div className="flex gap-2">
        <input
          name="doseAmount"
          type="number"
          min={0}
          step="any"
          placeholder="Dose"
          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          name="doseUnit"
          defaultValue={supplementDoseUnitEnum.enumValues[0]}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {supplementDoseUnitEnum.enumValues.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <select
          name="frequency"
          defaultValue={supplementFrequencyEnum.enumValues[0]}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {supplementFrequencyEnum.enumValues.map((freq) => (
            <option key={freq} value={freq}>
              {freq.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {state?.errors?.doseAmount && (
        <span className="text-xs text-danger">{state.errors.doseAmount[0]}</span>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Time of day (optional)
        <input
          name="preferredTime"
          type="time"
          className="w-40 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add supplement"}
      </button>
    </form>
  );
}
