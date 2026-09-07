/** The three macro keys a user can reorder (calories isn't a "macro" for this purpose, and stays
 * fixed in its own position everywhere it's shown alongside these). */
export const MACRO_KEYS = ["fat", "carbs", "protein"] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

/** Matches a standard nutrition label (fat, then carbs, then protein) — the default until a user
 * picks their own order in Settings > Nutrition. */
export const DEFAULT_MACRO_ORDER: MacroKey[] = ["fat", "carbs", "protein"];

export const MACRO_LABELS: Record<MacroKey, string> = {
  fat: "Fat",
  carbs: "Carbs",
  protein: "Protein",
};

/** Parses a stored "fat,carbs,protein"-style order string, falling back to the default if the
 * value is missing, malformed, or doesn't contain exactly the three known macro keys exactly once
 * each. */
export function parseMacroOrder(value: string | null | undefined): MacroKey[] {
  if (!value) return DEFAULT_MACRO_ORDER;
  const seen: MacroKey[] = [];
  for (const part of value.split(",")) {
    if ((MACRO_KEYS as readonly string[]).includes(part) && !seen.includes(part as MacroKey)) {
      seen.push(part as MacroKey);
    }
  }
  return seen.length === MACRO_KEYS.length ? seen : DEFAULT_MACRO_ORDER;
}

export function macroOrderToString(order: MacroKey[]): string {
  return order.join(",");
}

/** Maps a macro key to the `*Grams` field name used on nutrition entries/items/goals throughout
 * the codebase — lets editable-item components (whose state shape has fixed field names) render
 * their grid/inputs in a user's chosen order without renaming anything on disk. */
export const GRAM_FIELD = {
  fat: "fatGrams",
  carbs: "carbsGrams",
  protein: "proteinGrams",
} as const satisfies Record<MacroKey, string>;
