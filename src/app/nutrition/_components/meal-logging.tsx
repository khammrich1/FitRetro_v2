"use client";

import { useState } from "react";
import { MealForm, type PrefillItem } from "./meal-form";
import { SuggestionsPanel } from "./suggestions-panel";

export function MealLogging({ dayIso }: { dayIso: string }) {
  const [prefillItem, setPrefillItem] = useState<PrefillItem | null>(null);

  return (
    <>
      <MealForm
        dayIso={dayIso}
        prefillItem={prefillItem}
        onPrefillConsumed={() => setPrefillItem(null)}
      />
      <SuggestionsPanel dayIso={dayIso} onAdjustAndLog={setPrefillItem} />
    </>
  );
}
