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

      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}

      {state && "suggestions" in state && (
        <ul className="flex flex-col gap-2">
          {state.suggestions.map((suggestion) => (
            <li
              key={suggestion.name}
              className="rounded-md border border-border bg-background p-3 text-sm"
            >
              <p className="font-medium">{suggestion.name}</p>
              <p className="text-muted-foreground">{suggestion.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
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
