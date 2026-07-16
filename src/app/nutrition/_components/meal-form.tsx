"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { mealTypeEnum } from "@/db/schema";
import { logMealAction, estimateMacrosAction, type EstimateMacrosState } from "../actions";
import { useSpeechToText } from "./use-speech-to-text";

export function MealForm() {
  const [state, action, pending] = useActionState(logMealAction, undefined);
  const [description, setDescription] = useState("");
  const [macros, setMacros] = useState({
    calories: "",
    proteinGrams: "",
    carbsGrams: "",
    fatGrams: "",
  });
  const [estimateResult, setEstimateResult] = useState<EstimateMacrosState>(undefined);
  const [estimating, startEstimating] = useTransition();

  const {
    isListening,
    isSupported: micSupported,
    toggleListening,
  } = useSpeechToText((transcript) => {
    setDescription((current) => (current ? `${current} ${transcript}` : transcript));
  });

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.errors) {
      setDescription("");
      setMacros({ calories: "", proteinGrams: "", carbsGrams: "", fatGrams: "" });
      setEstimateResult(undefined);
    }
    wasPending.current = pending;
  }, [pending, state]);

  function handleEstimate() {
    startEstimating(async () => {
      const result = await estimateMacrosAction(description);
      setEstimateResult(result);
      if (result && "estimate" in result) {
        setMacros({
          calories: String(result.estimate.totalCalories),
          proteinGrams: String(result.estimate.totalProteinGrams),
          carbsGrams: String(result.estimate.totalCarbsGrams),
          fatGrams: String(result.estimate.totalFatGrams),
        });
      }
    });
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Log a meal</h2>

      <label className="flex flex-col gap-1 text-sm">
        Meal type
        <select
          name="mealType"
          defaultValue="breakfast"
          className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {mealTypeEnum.enumValues.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        What did you eat?
        <div className="flex gap-2">
          <input
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="40g chicken breast, 10g mixed vegetables"
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
        </div>
        {state?.errors?.description && (
          <span className="text-danger">{state.errors.description[0]}</span>
        )}
      </label>

      <button
        type="button"
        onClick={handleEstimate}
        disabled={estimating || !description.trim()}
        className="self-start rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {estimating ? "Estimating macros..." : "Estimate macros"}
      </button>

      {estimateResult && "error" in estimateResult && (
        <p className="text-sm text-danger">{estimateResult.error}</p>
      )}

      {estimateResult && "estimate" in estimateResult && (
        <ul className="text-sm text-muted-foreground">
          {estimateResult.estimate.items.map((item) => (
            <li key={item.name}>
              {item.quantity} {item.name} — {item.calories} kcal
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Calories
          <input
            name="calories"
            type="number"
            min={0}
            value={macros.calories}
            onChange={(event) => setMacros({ ...macros, calories: event.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Protein (g)
          <input
            name="proteinGrams"
            type="number"
            min={0}
            step="any"
            value={macros.proteinGrams}
            onChange={(event) => setMacros({ ...macros, proteinGrams: event.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Carbs (g)
          <input
            name="carbsGrams"
            type="number"
            min={0}
            step="any"
            value={macros.carbsGrams}
            onChange={(event) => setMacros({ ...macros, carbsGrams: event.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Fat (g)
          <input
            name="fatGrams"
            type="number"
            min={0}
            step="any"
            value={macros.fatGrams}
            onChange={(event) => setMacros({ ...macros, fatGrams: event.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Macros above are editable — adjust them if the estimate looks off, or skip estimating and
        enter them yourself.
      </p>

      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Logging..." : "Log meal"}
      </button>
    </form>
  );
}
