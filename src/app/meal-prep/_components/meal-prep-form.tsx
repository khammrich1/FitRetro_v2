"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import {
  estimateMacrosAction,
  estimateMacrosFromImageAction,
  type EstimateMacrosState,
} from "@/app/nutrition/actions";
import { addMealPrepBatchAction } from "@/app/pantry/actions";
import { useSpeechToText } from "@/lib/hooks/use-speech-to-text";

type EditableItem = {
  name: string;
  quantity: string;
  calories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatGrams: string;
};

const blankItem: EditableItem = {
  name: "",
  quantity: "",
  calories: "",
  proteinGrams: "",
  carbsGrams: "",
  fatGrams: "",
};

export function MealPrepForm() {
  const [state, action, pending] = useActionState(addMealPrepBatchAction, undefined);
  const [name, setName] = useState("");
  const [estimatePrompt, setEstimatePrompt] = useState("");
  const [portions, setPortions] = useState("4");
  const [items, setItems] = useState<EditableItem[]>([{ ...blankItem }]);
  const [estimateResult, setEstimateResult] = useState<EstimateMacrosState>(undefined);
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
    setItems((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  }

  function handleEstimate() {
    startEstimating(async () => {
      if (photo) {
        const formData = new FormData();
        formData.append("image", photo);
        formData.append("note", estimatePrompt);
        const result = await estimateMacrosFromImageAction(formData);
        setEstimateResult(result);
        if (result && "estimate" in result) {
          setItems(
            result.estimate.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              calories: String(item.calories),
              proteinGrams: String(item.proteinGrams),
              carbsGrams: String(item.carbsGrams),
              fatGrams: String(item.fatGrams),
            })),
          );
        }
        return;
      }

      const result = await estimateMacrosAction(estimatePrompt);
      setEstimateResult(result);
      if (result && "estimate" in result) {
        setItems(
          result.estimate.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            calories: String(item.calories),
            proteinGrams: String(item.proteinGrams),
            carbsGrams: String(item.carbsGrams),
            fatGrams: String(item.fatGrams),
          })),
        );
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
        Bulk ingredients
        <p className="text-xs font-normal text-muted-foreground">
          Describe everything that went into the batch — type it, speak it (🎤), or snap a photo
          (📷) — then hit &quot;Estimate macros.&quot; Skip this and fill in the items yourself
          below if you&apos;d rather enter everything manually.
        </p>
        <div className="flex gap-2">
          <input
            value={estimatePrompt}
            onChange={(event) => setEstimatePrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (!estimating && (estimatePrompt.trim() || photo)) handleEstimate();
              }
            }}
            placeholder="5lb chicken breast, 3 cups rice, 2 cups broccoli"
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
        {estimating ? "Estimating macros..." : "Estimate macros"}
      </button>

      {estimateResult && "error" in estimateResult && (
        <p className="text-sm text-danger">{estimateResult.error}</p>
      )}

      <div className="flex flex-col gap-2">
        {items.length > 0 && (
          <div className="grid grid-cols-4 gap-2 px-2 text-xs text-muted-foreground">
            <span>Calories</span>
            <span>Protein (g)</span>
            <span>Carbs (g)</span>
            <span>Fat (g)</span>
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
              {items.length > 1 && (
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
              <input
                type="number"
                min={0}
                step="any"
                value={item.proteinGrams}
                onChange={(event) => updateItem(index, "proteinGrams", event.target.value)}
                placeholder="protein"
                className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={item.carbsGrams}
                onChange={(event) => updateItem(index, "carbsGrams", event.target.value)}
                placeholder="carbs"
                className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={item.fatGrams}
                onChange={(event) => updateItem(index, "fatGrams", event.target.value)}
                placeholder="fat"
                className="rounded-md border border-border bg-card px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
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
          {Math.round(totals.calories)} kcal · {totals.proteinGrams.toFixed(1)}g protein ·{" "}
          {totals.carbsGrams.toFixed(1)}g carbs · {totals.fatGrams.toFixed(1)}g fat
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
          {Math.round(perPortion.calories)} kcal · {perPortion.proteinGrams.toFixed(1)}g protein ·{" "}
          {perPortion.carbsGrams.toFixed(1)}g carbs · {perPortion.fatGrams.toFixed(1)}g fat
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
