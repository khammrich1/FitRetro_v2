"use client";

import { useState, useTransition } from "react";
import { getSuggestionsAction, type SuggestionsState } from "../actions";

export function SuggestionsPanel() {
  const [state, setState] = useState<SuggestionsState>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSuggest() {
    startTransition(async () => {
      const result = await getSuggestionsAction();
      setState(result);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Food suggestions</h2>
        <button
          onClick={handleSuggest}
          disabled={pending}
          className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {pending ? "Thinking..." : "Suggest foods"}
        </button>
      </div>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      {state && "suggestions" in state && (
        <ul className="flex flex-col gap-2">
          {state.suggestions.map((suggestion) => (
            <li key={suggestion.name} className="rounded-md bg-black/5 p-3 text-sm dark:bg-white/5">
              <p className="font-medium">{suggestion.name}</p>
              <p className="text-zinc-600 dark:text-zinc-400">{suggestion.description}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {suggestion.calories} kcal · {suggestion.proteinGrams}g protein ·{" "}
                {suggestion.carbsGrams}g carbs · {suggestion.fatGrams}g fat
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
