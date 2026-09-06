"use client";

import { useRef, useState, useTransition } from "react";
import { mealTypeEnum } from "@/db/schema";
import { useSpeechToText } from "@/lib/hooks/use-speech-to-text";
import { capitalize } from "@/lib/strings";
import {
  saveMealTemplateAction,
  estimateMacrosAction,
  estimateMacrosFromImageAction,
  type EstimateMacrosState,
} from "@/app/nutrition/actions";
import type { MealTemplateWithItems, MacroEstimate } from "@/features/nutrition";

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

function isBlankItem(item: EditableItem) {
  return (
    item.name.trim() === "" &&
    item.calories.trim() === "" &&
    item.proteinGrams.trim() === "" &&
    item.carbsGrams.trim() === "" &&
    item.fatGrams.trim() === ""
  );
}

export function MealTemplateForm({
  template,
  onClose,
}: {
  template?: MealTemplateWithItems;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [mealType, setMealType] = useState(template?.mealType ?? mealTypeEnum.enumValues[0]);
  const [items, setItems] = useState<EditableItem[]>(
    template && template.items.length > 0
      ? template.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          calories: String(item.calories),
          proteinGrams: String(item.proteinGrams),
          carbsGrams: String(item.carbsGrams),
          fatGrams: String(item.fatGrams),
        }))
      : [{ ...blankItem }],
  );
  const [description, setDescription] = useState("");
  const [estimateResult, setEstimateResult] = useState<EstimateMacrosState>(undefined);
  const [estimating, startEstimating] = useTransition();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>(undefined);
  const [saving, startSaving] = useTransition();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    isSupported: micSupported,
    toggleListening,
    error: micError,
  } = useSpeechToText((transcript) => {
    setDescription((current) => (current ? `${current} ${transcript}` : transcript));
  });

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

  function applyEstimateItems(estimateItems: MacroEstimate["items"]) {
    setItems(
      estimateItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        calories: String(item.calories),
        proteinGrams: String(item.proteinGrams),
        carbsGrams: String(item.carbsGrams),
        fatGrams: String(item.fatGrams),
      })),
    );
  }

  function handleEstimate() {
    startEstimating(async () => {
      if (photo) {
        const formData = new FormData();
        formData.append("image", photo);
        formData.append("note", description);
        const result = await estimateMacrosFromImageAction(formData);
        setEstimateResult(result);
        if (result && "estimate" in result) {
          if (!description.trim()) {
            setDescription(
              result.estimate.items.map((item) => `${item.quantity} ${item.name}`).join(", "),
            );
          }
          applyEstimateItems(result.estimate.items);
        }
        return;
      }

      const result = await estimateMacrosAction(description);
      setEstimateResult(result);
      if (result && "estimate" in result) {
        applyEstimateItems(result.estimate.items);
      }
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

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      proteinGrams: acc.proteinGrams + (Number(item.proteinGrams) || 0),
      carbsGrams: acc.carbsGrams + (Number(item.carbsGrams) || 0),
      fatGrams: acc.fatGrams + (Number(item.fatGrams) || 0),
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("mealType", mealType);
    formData.set(
      "items",
      JSON.stringify(
        items
          .filter((item) => !isBlankItem(item))
          .map((item) => ({
            name: item.name,
            quantity: item.quantity,
            calories: item.calories.trim() === "" ? 0 : Number(item.calories),
            proteinGrams: item.proteinGrams.trim() === "" ? 0 : Number(item.proteinGrams),
            carbsGrams: item.carbsGrams.trim() === "" ? 0 : Number(item.carbsGrams),
            fatGrams: item.fatGrams.trim() === "" ? 0 : Number(item.fatGrams),
          })),
      ),
    );
    startSaving(async () => {
      const result = await saveMealTemplateAction(template?.id, undefined, formData);
      if (result?.errors) {
        setErrors(result.errors);
      } else {
        setErrors(undefined);
        onClose();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-border bg-background p-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Template name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Usual breakfast"
          className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {errors?.name && <span className="text-xs text-danger">{errors.name[0]}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Meal type
        <select
          value={mealType}
          onChange={(event) =>
            setMealType(event.target.value as (typeof mealTypeEnum.enumValues)[number])
          }
          className="rounded-md border border-border bg-card px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {mealTypeEnum.enumValues.map((type) => (
            <option key={type} value={type}>
              {capitalize(type)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        What&apos;s in it?
        <p className="text-xs font-normal text-muted-foreground">
          Type it, speak it, or snap a photo — then hit &quot;Estimate macros.&quot; You only need
          to do this once; logging the template later reuses these numbers.
        </p>
        <div className="flex gap-2">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="2 eggs, 2 slices toast, 1 cup black coffee"
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
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            title="Add a photo of this meal"
            className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent"
          >
            📷
          </button>
        </div>
        {micError && <span className="text-xs text-danger">{micError}</span>}
      </label>

      {photoPreviewUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreviewUrl}
            alt="Selected meal"
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
        disabled={estimating || (!description.trim() && !photo)}
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
            <span>Fat (g)</span>
            <span>Carbs (g)</span>
            <span>Protein (g)</span>
          </div>
        )}
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-md border border-border bg-card p-2"
          >
            <div className="flex gap-2">
              <input
                value={item.name}
                onChange={(event) => updateItem(index, "name", event.target.value)}
                placeholder="Item name"
                className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={item.fatGrams}
                onChange={(event) => updateItem(index, "fatGrams", event.target.value)}
                placeholder="fat"
                className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={item.carbsGrams}
                onChange={(event) => updateItem(index, "carbsGrams", event.target.value)}
                placeholder="carbs"
                className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={item.proteinGrams}
                onChange={(event) => updateItem(index, "proteinGrams", event.target.value)}
                placeholder="protein"
                className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="self-start text-xs text-accent hover:underline"
        >
          + Add item
        </button>
      </div>
      {errors?.items && <span className="text-sm text-danger">{errors.items[0]}</span>}

      <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className="font-medium">Total</span>
        <span className="text-muted-foreground">
          {Math.round(totals.calories)} kcal · {totals.fatGrams.toFixed(1)}g fat ·{" "}
          {totals.carbsGrams.toFixed(1)}g carbs · {totals.proteinGrams.toFixed(1)}g protein
        </span>
      </div>

      <div className="flex gap-3">
        <button
          disabled={saving}
          type="submit"
          className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save template"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-danger hover:text-danger disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
