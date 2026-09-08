"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import {
  addPantryItemAction,
  identifyPantryItemFromImageAction,
  type IdentifyPantryItemState,
} from "../actions";
import { MACRO_LABELS, GRAM_FIELD, type MacroKey } from "@/lib/macro-order";

export function PantryItemForm({ macroOrder }: { macroOrder: MacroKey[] }) {
  const [state, action, pending] = useActionState(addPantryItemAction, undefined);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [trackUnits, setTrackUnits] = useState(false);
  const [unitCount, setUnitCount] = useState("");
  const [calories, setCalories] = useState("");
  const [fatGrams, setFatGrams] = useState("");
  const [carbsGrams, setCarbsGrams] = useState("");
  const [proteinGrams, setProteinGrams] = useState("");
  const [identifyResult, setIdentifyResult] = useState<IdentifyPantryItemState>(undefined);
  const [identifying, startIdentifying] = useTransition();
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const gramValueByKey: Record<MacroKey, [string, (value: string) => void]> = {
    fat: [fatGrams, setFatGrams],
    carbs: [carbsGrams, setCarbsGrams],
    protein: [proteinGrams, setProteinGrams],
  };

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.errors) {
      setName("");
      setQuantity("");
      setTrackUnits(false);
      setUnitCount("");
      setCalories("");
      setFatGrams("");
      setCarbsGrams("");
      setProteinGrams("");
      setIdentifyResult(undefined);
      clearPhoto();
    }
    wasPending.current = pending;
  }, [pending, state]);

  function clearPhoto() {
    setPhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handlePhotoSelected(file: File | undefined) {
    if (!file) return;
    setPhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });

    startIdentifying(async () => {
      const formData = new FormData();
      formData.append("image", file);
      const result = await identifyPantryItemFromImageAction(formData);
      setIdentifyResult(result);
      if (result && "identification" in result) {
        setName(result.identification.name);
        setQuantity(result.identification.quantity ?? "");
      }
    });
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Add pantry item</h2>

      <label className="flex flex-col gap-1 text-sm">
        Item
        <div className="flex gap-2">
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="chicken breast"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            title="Scan a photo of the item"
            disabled={identifying}
            className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {identifying ? "Scanning..." : "📷 Scan"}
          </button>
        </div>
        {state?.errors?.name && <span className="text-danger">{state.errors.name[0]}</span>}
        {identifyResult && "error" in identifyResult && (
          <span className="text-danger">{identifyResult.error}</span>
        )}
      </label>

      {photoPreviewUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreviewUrl}
            alt="Scanned pantry item"
            className="h-16 w-16 rounded-md border border-border object-cover"
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="text-sm text-muted-foreground hover:text-danger"
          >
            Remove photo
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Quantity (optional)
        <input
          name="quantity"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="2 lbs, 1 can, half a bag..."
          className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={trackUnits}
          onChange={(event) => setTrackUnits(event.target.checked)}
        />
        Track individual units (e.g. a case of protein shakes) — quick-log one at a time from Today
      </label>

      {trackUnits && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
          <label className="flex flex-col gap-1 text-sm">
            How many units
            <input
              name="unitCount"
              type="number"
              min={1}
              value={unitCount}
              onChange={(event) => setUnitCount(event.target.value)}
              placeholder="12"
              className="w-24 rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {state?.errors?.unitCount && (
              <span className="text-danger">{state.errors.unitCount[0]}</span>
            )}
          </label>
          <p className="text-xs text-muted-foreground">Macros for one unit (e.g. one shake):</p>
          <div className="grid grid-cols-4 gap-2 px-2 text-xs text-muted-foreground">
            <span>Calories</span>
            {macroOrder.map((key) => (
              <span key={key}>{MACRO_LABELS[key]} (g)</span>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input
              name="calories"
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
                  name={GRAM_FIELD[key]}
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

      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add to pantry"}
      </button>
    </form>
  );
}
