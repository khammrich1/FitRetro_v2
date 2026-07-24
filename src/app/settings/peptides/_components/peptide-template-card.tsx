"use client";

import { useState, useTransition } from "react";
import { peptideDoseUnitEnum, peptideFrequencyEnum, type PeptideTemplate } from "@/db/schema";
import { updatePeptideTemplateAction, deletePeptideTemplateAction } from "@/app/peptides/actions";

/** Formats a 24-hour "HH:MM" string (from a native time input) as e.g. "8:00 AM". */
function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function PeptideTemplateCard({ template }: { template: PeptideTemplate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [doseAmount, setDoseAmount] = useState(String(template.doseAmount));
  const [doseUnit, setDoseUnit] = useState(template.doseUnit);
  const [frequency, setFrequency] = useState(template.frequency);
  const [preferredTime, setPreferredTime] = useState(template.preferredTime ?? "");
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleting] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("doseAmount", doseAmount);
    formData.set("doseUnit", doseUnit);
    formData.set("frequency", frequency);
    formData.set("preferredTime", preferredTime);
    startTransition(async () => {
      const result = await updatePeptideTemplateAction(template.id, formData);
      if (result?.errors) {
        setErrors(result.errors);
      } else {
        setErrors(undefined);
        setEditing(false);
      }
    });
  }

  function handleDelete() {
    startDeleting(async () => {
      await deletePeptideTemplateAction(template.id);
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Peptide name"
          className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {errors?.name && <span className="text-xs text-danger">{errors.name[0]}</span>}
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            step="any"
            value={doseAmount}
            onChange={(event) => setDoseAmount(event.target.value)}
            placeholder="Dose"
            className="w-24 rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={doseUnit}
            onChange={(event) =>
              setDoseUnit(event.target.value as (typeof peptideDoseUnitEnum.enumValues)[number])
            }
            className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {peptideDoseUnitEnum.enumValues.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <select
            value={frequency}
            onChange={(event) =>
              setFrequency(event.target.value as (typeof peptideFrequencyEnum.enumValues)[number])
            }
            className="flex-1 rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {peptideFrequencyEnum.enumValues.map((freq) => (
              <option key={freq} value={freq}>
                {freq.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        {errors?.doseAmount && <span className="text-xs text-danger">{errors.doseAmount[0]}</span>}
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Time of day (optional)
          <input
            type="time"
            value={preferredTime}
            onChange={(event) => setPreferredTime(event.target.value)}
            className="w-40 rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
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
      </div>
    );
  }

  const formattedTime = formatTime(template.preferredTime);

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm">
      <div>
        <span className="font-medium">{template.name}</span>{" "}
        <span className="text-muted-foreground">
          — {template.doseAmount}
          {template.doseUnit}, {template.frequency.replaceAll("_", " ")}
          {formattedTime ? `, ${formattedTime}` : ""}
        </span>
      </div>
      <div className="flex gap-3 text-xs">
        <button
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-accent"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-muted-foreground hover:text-danger"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
