"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import {
  estimateMacrosAction,
  estimateMacrosFromImageAction,
  type EstimateMacrosState,
} from "@/app/nutrition/actions";
import { addMealPrepBatchAction } from "@/app/pantry/actions";
import { useSpeechToText } from "@/lib/hooks/use-speech-to-text";
import { MACRO_LABELS, GRAM_FIELD, type MacroKey } from "@/lib/macro-order";
import {
  appendItems,
  blankItem,
  isBlankItem,
  removeItemAt,
  type EditableItem,
} from "./ingredients";

type EstimatedItem = {
  name: string;
  quantity: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

function toEditable(item: EstimatedItem): EditableItem {
  return {
    name: item.name,
    quantity: item.quantity,
    calories: String(item.calories),
    proteinGrams: String(item.proteinGrams),
    carbsGrams: String(item.carbsGrams),
    fatGrams: String(item.fatGrams),
  };
}

export function MealPrepForm({ macroOrder }: { macroOrder: MacroKey[] }) {
  const [state, action, pending] = useActionState(addMealPrepBatchAction, undefined);
  const [name, setName] = useState("");
  const [estimatePrompt, setEstimatePrompt] = useState("");
  const [portions, setPortions] = useState("4");
  const [items, setItems] = useState<EditableItem[]>([{ ...blankItem }]);
  const [estimateResult, setEstimateResult] = useState<EstimateMacrosState>(undefined);
  /** What the most recent estimate added — shown so each ingredient's macros are visible as
   * it's added, before moving on to the next one. */
  const [lastAdded, setLastAdded] = useState<EditableItem[]>([]);
  const estimateInputRef = useRef<HTMLInputElement>(null);
  const [estimating, startEstimating] = useTransition();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    isListening,
    isSupported: micSupported,
    toggleListening,
    error: micError,
  } = useSpeechToText((transcript) => {
    setEstimatePrompt((current) => (current ? `${current} ${transcript}` : transcript));
  });

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.errors) {
      setName("");
      setEstimatePrompt("");
      setPortions("4");
      setItems([{ ...blankItem }]);
      setEstimateResult(undefined);
      setLastAdded([]);
      clearPhoto();
    }
    wasPending.current = pending;
  }, [pending, state]);

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handlePhotoSelected(file: File | undefined) {
    if (!file) return;
    setPhoto(file);
    setPhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function updateItem(index: number, field: keyof EditableItem, value: string) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((current) => [...current, { ...blankItem }]);
  }

  function removeItem(index: number) {
    setItems((current) => removeItemAt(current, index));
  }

  /** Estimates only what's in the input box and appends it to the batch — ingredients already
   * on the list (estimated or typed by hand) are never replaced or changed. */
  function handleEstimate() {
    startEstimating(async () => {
      let result: EstimateMacrosState;
      if (photo) {
        const formData = new FormData();
        formData.append("image", photo);
        formData.append("note", estimatePrompt);
        formData.append("purpose", "batch");
        result = await estimateMacrosFromImageAction(formData);
      } else {
        result = await estimateMacrosAction(estimatePrompt, "batch");
      }
      setEstimateResult(result);
      if (result && "estimate" in result) {
        const added = result.estimate.items.map(toEditable);
        setItems((current) => appendItems(current, added));
        setLastAdded(added);
        setEstimatePrompt("");
        clearPhoto();
        estimateInputRef.current?.focus();
      }
    });
  }

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      proteinGrams: acc.proteinGrams + (Number(item.proteinGrams) || 0),
      carbsGrams: acc.carbsGrams + (Number(item.carbsGrams) || 0),
      fatGrams: acc.fatGrams + (Number(item.fatGrams) || 0),
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );

  const portionsNum = Math.max(1, Number(portions) || 1);
  const perPortion = {
    calories: totals.calories / portionsNum,
    proteinGrams: totals.proteinGrams / portionsNum,
    carbsGrams: totals.carbsGrams / portionsNum,
    fatGrams: totals.fatGrams / portionsNum,
  };

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Prep a batch</h2>

      <label className="flex flex-col gap-1 text-sm">
        Batch name
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Turkey chili"
          className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {state?.errors?.name && <span className="text-danger">{state.errors.name[0]}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Add ingredients
        <p className="text-xs font-normal text-muted-foreground">
          Add ingredients one at a time as you build the batch (or several at once) — type it
          (&quot;40g green beans&quot;), speak it (🎤), or snap a photo (📷) of it on your kitchen
          scale with the weight showing, or of the package label. Then hit &quot;Estimate &amp;
          add.&quot; Amounts count as raw and for the whole batch. Each estimate is added to the
          list below; nothing already on the list changes, and you can edit any row by hand.
        </p>
        <div className="flex gap-2">
          <input
            ref={estimateInputRef}
            value={estimatePrompt}
            onChange={(event) => setEstimatePrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (!estimating && (estimatePrompt.trim() || photo)) handleEstimate();
              }
            }}
            placeholder="e.g. 40g green beans"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            title="Add a photo of the batch"
            className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent"
          >
            📷
          </button>
        </div>
        {micError && <span className="text-danger">{micError}</span>}
      </label>

      {photoPreviewUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreviewUrl}
            alt="Selected batch"
            className="h-20 w-20 rounded-md border border-border object-cover"
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

      <button
        type="button"
        onClick={handleEstimate}
        disabled={estimating || (!estimatePrompt.trim() && !photo)}
        className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {estimating ? "Estimating..." : "Estimate & add"}
      </button>

      {estimateResult && "error" in estimateResult && (
        <p className="text-sm text-danger">{estimateResult.error}</p>
      )}

      {lastAdded.length > 0 && (
        <div role="status" className="rounded-md border border-accent px-3 py-2 text-xs">
          <span className="font-medium text-accent">Added:</span>
          <ul>
            {lastAdded.map((item, index) => (
              <li key={index} className="text-muted-foreground">
                {item.name}
                {item.quantity ? ` (${item.quantity})` : ""} — {Math.round(Number(item.calories))}{" "}
                kcal ·{" "}
                {macroOrder
                  .map((key) => `${(Number(item[GRAM_FIELD[key]]) || 0).toFixed(1)}g ${key}`)
                  .join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.length > 0 && (
          <div className="grid grid-cols-4 gap-2 px-2 text-xs text-muted-foreground">
            <span>Calories</span>
            {macroOrder.map((key) => (
              <span key={key}>{MACRO_LABELS[key]} (g)</span>
            ))}
          </div>
        )}
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-md border border-border bg-background p-2"
          >
            <div className="flex gap-2">
              <input
                value={item.name}
                onChange={(event) => updateItem(index, "name", event.target.value)}
                placeholder="Ingredient name"
                className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {(items.length > 1 || !isBlankItem(item)) && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-xs text-muted-foreground hover:text-danger"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                min={0}
                value={item.calories}
                onChange={(event) => updateItem(index, "calories", event.target.value)}
                placeholder="kcal"
                className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {macroOrder.map((key) => (
                <input
                  key={key}
                  type="number"
                  min={0}
                  step="any"
                  value={item[GRAM_FIELD[key]]}
                  onChange={(event) => updateItem(index, GRAM_FIELD[key], event.target.value)}
                  placeholder={key}
                  className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="self-start text-xs text-accent hover:underline"
        >
          + Add ingredient
        </button>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className="font-medium">Batch total</span>
        <span className="text-muted-foreground">
          {Math.round(totals.calories)} kcal ·{" "}
          {macroOrder.map((key) => `${totals[GRAM_FIELD[key]].toFixed(1)}g ${key}`).join(" · ")}
        </span>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Portions
        <input
          name="portions"
          type="number"
          min={1}
          value={portions}
          onChange={(event) => setPortions(event.target.value)}
          className="w-24 rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {state?.errors?.portions && <span className="text-danger">{state.errors.portions[0]}</span>}
      </label>

      <div className="flex items-center justify-between rounded-md border border-accent bg-card px-3 py-2 text-sm">
        <span className="font-medium text-accent">Per portion</span>
        <span className="text-muted-foreground">
          {Math.round(perPortion.calories)} kcal ·{" "}
          {macroOrder.map((key) => `${perPortion[GRAM_FIELD[key]].toFixed(1)}g ${key}`).join(" · ")}
        </span>
      </div>

      {state?.errors?.items && <p className="text-sm text-danger">{state.errors.items[0]}</p>}

      <input
        type="hidden"
        name="items"
        value={JSON.stringify(items.filter((item) => item.name.trim() !== ""))}
      />

      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Adding to pantry..." : "Add to pantry"}
      </button>
    </form>
  );
}
