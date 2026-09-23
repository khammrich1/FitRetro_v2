"use client";

import { useActionState, useState } from "react";
import { peptideDoseUnitEnum, peptideFrequencyEnum, type PeptideDoseUnit } from "@/db/schema";
import { createPeptideTemplateAction } from "@/app/peptides/actions";
import { computeDrawVolumeMl, mlToSyringeUnits } from "@/features/peptides/reconstitution";

export function NewPeptideForm() {
  const [state, action, pending] = useActionState(createPeptideTemplateAction, undefined);

  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnit, setDoseUnit] = useState<PeptideDoseUnit>(peptideDoseUnitEnum.enumValues[0]);
  const [vialAmountMg, setVialAmountMg] = useState("");
  const [bacWaterMl, setBacWaterMl] = useState("");

  const drawMl = computeDrawVolumeMl({
    vialAmountMg: Number(vialAmountMg) || null,
    bacWaterMl: Number(bacWaterMl) || null,
    doseAmount: Number(doseAmount) || 0,
    doseUnit,
  });

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">New peptide</h2>
      <input
        name="name"
        placeholder="Peptide name"
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
          value={doseAmount}
          onChange={(event) => setDoseAmount(event.target.value)}
          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          name="doseUnit"
          value={doseUnit}
          onChange={(event) => setDoseUnit(event.target.value as PeptideDoseUnit)}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {peptideDoseUnitEnum.enumValues.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <select
          name="frequency"
          defaultValue={peptideFrequencyEnum.enumValues[0]}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {peptideFrequencyEnum.enumValues.map((freq) => (
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

      {(doseUnit === "mg" || doseUnit === "mcg") && (
        <div className="flex flex-col gap-1 rounded-md border border-border bg-background p-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Reconstitution (optional)
          </span>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Vial amount (mg)
              <input
                name="vialAmountMg"
                type="number"
                min={0}
                step="any"
                value={vialAmountMg}
                onChange={(event) => setVialAmountMg(event.target.value)}
                className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Bac water added (mL)
              <input
                name="bacWaterMl"
                type="number"
                min={0}
                step="any"
                value={bacWaterMl}
                onChange={(event) => setBacWaterMl(event.target.value)}
                className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          {drawMl !== null && (
            <span className="text-xs text-accent">
              → draw {drawMl.toFixed(2)}mL ({mlToSyringeUnits(drawMl).toFixed(0)} units on a U-100
              syringe) per dose
            </span>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Half-life (hours, optional)
        <input
          name="halfLifeHours"
          type="number"
          min={0}
          step="any"
          className="w-32 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-xs text-muted-foreground">
          Enables a rough &quot;level in body&quot; estimate on Today — not medical guidance, just
          decay math from the half-life you enter.
        </span>
      </label>

      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add peptide"}
      </button>
    </form>
  );
}
