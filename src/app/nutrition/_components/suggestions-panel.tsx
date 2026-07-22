"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { mealTypeEnum } from "@/db/schema";
import type { FoodSuggestion } from "@/features/nutrition";
import {
  getSuggestionsAction,
  logSuggestionAction,
  getRecipeAction,
  estimateMacrosAction,
  type SuggestionsState,
  type RecipeState,
} from "../actions";
import type { MealPrefill } from "./meal-form";

function inferMealType(): (typeof mealTypeEnum.enumValues)[number] {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

function SuggestionCard({
  suggestion,
  dayIso,
  onAdjustAndLog,
}: {
  suggestion: FoodSuggestion;
  dayIso: string;
  onAdjustAndLog: (prefill: MealPrefill) => void;
}) {
  const [logged, setLogged] = useState(false);
  const [logging, startLogging] = useTransition();
  const [recipeState, setRecipeState] = useState<RecipeState>(undefined);
  const [loadingRecipe, startLoadingRecipe] = useTransition();
  const [showRecipe, setShowRecipe] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjusting, startAdjusting] = useTransition();

  function handleLogAsIs() {
    startLogging(async () => {
      const result = await logSuggestionAction({
        mealType: inferMealType(),
        dayIso,
        name: suggestion.name,
        description: suggestion.description,
        calories: suggestion.calories,
        proteinGrams: suggestion.proteinGrams,
        carbsGrams: suggestion.carbsGrams,
        fatGrams: suggestion.fatGrams,
      });
      if (!result.error) setLogged(true);
    });
  }

  function handleAdjustAndLog() {
    setAdjustError(null);
    startAdjusting(async () => {
      // Itemize on demand — only when the user actually wants to edit it, rather than every
      // suggestion paying for a breakdown that's usually never opened.
      const result = await estimateMacrosAction(`${suggestion.name} — ${suggestion.description}`);
      if (result && "estimate" in result) {
        onAdjustAndLog({ description: suggestion.name, items: result.estimate.items });
        return;
      }
      // Fall back to a single lumped item rather than blocking the user entirely.
      setAdjustError(
        result?.error ?? "Couldn't break this into items — added as one item instead.",
      );
      onAdjustAndLog({
        description: suggestion.name,
        items: [
          {
            name: suggestion.name,
            quantity: suggestion.description,
            calories: suggestion.calories,
            proteinGrams: suggestion.proteinGrams,
            carbsGrams: suggestion.carbsGrams,
            fatGrams: suggestion.fatGrams,
          },
        ],
      });
    });
  }

  function handleGetRecipe() {
    if (recipeState && "recipe" in recipeState) {
      setShowRecipe((current) => !current);
      return;
    }
    startLoadingRecipe(async () => {
      const result = await getRecipeAction(suggestion.name, suggestion.description, {
        calories: suggestion.calories,
        proteinGrams: suggestion.proteinGrams,
        carbsGrams: suggestion.carbsGrams,
        fatGrams: suggestion.fatGrams,
      });
      setRecipeState(result);
      setShowRecipe(true);
    });
  }

  return (
    <li className="rounded-md border border-border bg-background p-3 text-sm">
      <p className="font-medium">{suggestion.name}</p>
      <p className="text-muted-foreground">{suggestion.description}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {suggestion.calories} kcal · {suggestion.proteinGrams}g protein · {suggestion.carbsGrams}g
        carbs · {suggestion.fatGrams}g fat
      </p>
      <p className="mt-1 text-xs text-accent">{suggestion.reason}</p>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {logged ? (
          <span className="text-accent">Logged ✓</span>
        ) : (
          <button
            type="button"
            onClick={handleLogAsIs}
            disabled={logging}
            className="text-muted-foreground hover:text-accent disabled:opacity-50"
          >
            {logging ? "Logging..." : "Log as-is"}
          </button>
        )}
        <button
          type="button"
          onClick={handleAdjustAndLog}
          disabled={adjusting}
          className="text-muted-foreground hover:text-accent disabled:opacity-50"
        >
          {adjusting ? "Breaking down..." : "Adjust & log"}
        </button>
        <button
          type="button"
          onClick={handleGetRecipe}
          disabled={loadingRecipe}
          className="text-muted-foreground hover:text-accent disabled:opacity-50"
        >
          {loadingRecipe ? "Loading recipe..." : showRecipe ? "Hide recipe" : "Get recipe"}
        </button>
      </div>

      {adjustError && <p className="mt-1 text-xs text-danger">{adjustError}</p>}

      {showRecipe && recipeState && "error" in recipeState && (
        <p className="mt-2 text-xs text-danger">{recipeState.error}</p>
      )}

      {showRecipe && recipeState && "recipe" in recipeState && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Ingredients</p>
            <ul className="list-disc pl-4">
              {recipeState.recipe.ingredients.map((ingredient, index) => (
                <li key={index}>{ingredient}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Instructions</p>
            <ol className="list-decimal pl-4">
              {recipeState.recipe.instructions.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </li>
  );
}

export function SuggestionsPanel({
  dayIso,
  onAdjustAndLog,
}: {
  dayIso: string;
  onAdjustAndLog: (prefill: MealPrefill) => void;
}) {
  const [state, setState] = useState<SuggestionsState>(undefined);
  const [preference, setPreference] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSuggest() {
    startTransition(async () => {
      const result = await getSuggestionsAction(dayIso, preference);
      setState(result);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Food suggestions
        </h2>
        <button
          onClick={handleSuggest}
          disabled={pending}
          className="retro-glow rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Thinking..." : "Suggest foods"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Based on whatever&apos;s left of your daily macro targets (not the full targets), and
        prioritizes items in your{" "}
        <Link href="/pantry" className="underline hover:text-accent">
          pantry
        </Link>{" "}
        when they fit.
      </p>

      <input
        value={preference}
        onChange={(event) => setPreference(event.target.value)}
        placeholder="Feeling like Mexican, have leftover chicken, craving something sweet..."
        className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <p className="text-xs text-muted-foreground">
        Optional — most suggestions will lean toward this, plus a couple of options outside of it.
      </p>

      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}

      {state && "suggestions" in state && (
        <ul className="flex flex-col gap-2">
          {state.suggestions.map((suggestion, index) => (
            <SuggestionCard
              key={index}
              suggestion={suggestion}
              dayIso={dayIso}
              onAdjustAndLog={onAdjustAndLog}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
