"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import {
  addPantryItemAction,
  identifyPantryItemFromImageAction,
  type IdentifyPantryItemState,
} from "../actions";
import {
  estimateMacrosAction,
  estimateMacrosFromImageAction,
  type EstimateMacrosState,
} from "@/app/nutrition/actions";
import { useSpeechToText } from "@/lib/hooks/use-speech-to-text";
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

  // Separate from the item photo/scan above — this estimates the per-unit macros (e.g. "Oikos
  // Triple Zero vanilla, single cup"), not the item's name/quantity.
  const [estimatePrompt, setEstimatePrompt] = useState("");
  const [estimatePhoto, setEstimatePhoto] = useState<File | null>(null);
  const [estimatePhotoPreviewUrl, setEstimatePhotoPreviewUrl] = useState<string | null>(null);
  const [estimateResult, setEstimateResult] = useState<EstimateMacrosState>(undefined);
  const [estimating, startEstimating] = useTransition();
  const estimatePhotoInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    isSupported: micSupported,
    toggleListening,
    error: micError,
  } = useSpeechToText((transcript) => {
    setEstimatePrompt((current) => (current ? `${current} ${transcript}` : transcript));
  });

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
      setEstimatePrompt("");
      setEstimateResult(undefined);
      clearEstimatePhoto();
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

  function clearEstimatePhoto() {
    setEstimatePhoto(null);
    setEstimatePhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (estimatePhotoInputRef.current) estimatePhotoInputRef.current.value = "";
  }

  function handleEstimatePhotoSelected(file: File | undefined) {
    if (!file) return;
    setEstimatePhoto(file);
    setEstimatePhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function applyEstimate(
    items: { calories: number; fatGrams: number; carbsGrams: number; proteinGrams: number }[],
  ) {
    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        fatGrams: acc.fatGrams + item.fatGrams,
        carbsGrams: acc.carbsGrams + item.carbsGrams,
        proteinGrams: acc.proteinGrams + item.proteinGrams,
      }),
      { calories: 0, fatGrams: 0, carbsGrams: 0, proteinGrams: 0 },
    );
    setCalories(String(Math.round(totals.calories)));
    setFatGrams(totals.fatGrams.toFixed(1));
    setCarbsGrams(totals.carbsGrams.toFixed(1));
    setProteinGrams(totals.proteinGrams.toFixed(1));
  }

  function handleEstimate() {
    startEstimating(async () => {
      if (estimatePhoto) {
        const formData = new FormData();
        formData.append("image", estimatePhoto);
        formData.append("note", estimatePrompt);
        const result = await estimateMacrosFromImageAction(formData);
        setEstimateResult(result);
        if (result && "estimate" in result) {
          if (!name.trim()) setName(estimatePrompt.trim() || result.estimate.items[0]?.name || "");
          applyEstimate(result.estimate.items);
        }
        return;
      }

      const result = await estimateMacrosAction(estimatePrompt);
      setEstimateResult(result);
      if (result && "estimate" in result) {
        if (!name.trim()) setName(estimatePrompt.trim());
        applyEstimate(result.estimate.items);
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
        Track individual units (e.g. a case of protein shakes, Oikos yogurts) — quick-log one at a
        time from Today
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

          <label className="flex flex-col gap-1 text-sm">
            Macros for one unit
            <p className="text-xs font-normal text-muted-foreground">
              Describe it (e.g. &quot;Oikos Triple Zero vanilla, single cup&quot;) or snap a photo
              of the nutrition label, then hit &quot;Estimate macros&quot; — or skip this and enter
              the numbers yourself below.
            </p>
            <div className="flex gap-2">
              <input
                value={estimatePrompt}
                onChange={(event) => setEstimatePrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (!estimating && (estimatePrompt.trim() || estimatePhoto)) handleEstimate();
                  }
                }}
                placeholder="Oikos Triple Zero vanilla, single cup"
                className="flex-1 rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-pressed={isListening}
                  title={isListening ? "Stop listening" : "Describe by voice"}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    isListening
                      ? "border-danger text-danger"
                      : "border-border hover:border-accent hover:text-accent"
                  }`}
                >
                  {isListening ? "● Listening" : "🎤"}
                </button>
              )}
              <input
                ref={estimatePhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => handleEstimatePhotoSelected(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => estimatePhotoInputRef.current?.click()}
                title="Snap the nutrition label"
                className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent"
              >
                📷
              </button>
            </div>
            {micError && <span className="text-danger">{micError}</span>}
          </label>

          {estimatePhotoPreviewUrl && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={estimatePhotoPreviewUrl}
                alt="Nutrition label"
                className="h-16 w-16 rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={clearEstimatePhoto}
                className="text-sm text-muted-foreground hover:text-danger"
              >
                Remove photo
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleEstimate}
            disabled={estimating || (!estimatePrompt.trim() && !estimatePhoto)}
            className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {estimating ? "Estimating macros..." : "Estimate macros"}
          </button>

          {estimateResult && "error" in estimateResult && (
            <p className="text-sm text-danger">{estimateResult.error}</p>
          )}

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
