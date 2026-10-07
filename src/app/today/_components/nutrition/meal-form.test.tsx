import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MealForm } from "./meal-form";
vi.mock("@/app/nutrition/actions", () => ({
  logMealAction: vi.fn(),
  estimateMacrosAction: vi.fn(),
  estimateMacrosFromImageAction: vi.fn(),
}));
vi.mock("@/lib/hooks/use-speech-to-text", () => ({
  useSpeechToText: () => ({ isListening: false, isSupported: false, toggleListening: vi.fn() }),
}));

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const macros = ["fat", "carbs", "protein"] as const;
describe("meal draft accessibility and reuse", () => {
  it("labels every numeric field with its item and units as items are added", () => {
    render(<MealForm dayIso="2026-10-07" macroOrder={[...macros]} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
    for (const n of [1, 2]) {
      expect(screen.getByRole("textbox", { name: `Item ${n} name` })).toBeInTheDocument();
      for (const label of ["calories (kcal)", "Fat (g)", "Carbs (g)", "Protein (g)"]) {
        expect(screen.getByRole("spinbutton", { name: `Item ${n} ${label}` })).toBeInTheDocument();
      }
    }
  });
  it("appends a template meal to an existing draft without replacing its description or submitting", async () => {
    const onConsumed = vi.fn();
    const view = render(<MealForm dayIso="2026-10-07" macroOrder={[...macros]} />);
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "My lunch" } });
    fireEvent.change(screen.getByLabelText("Item 1 name"), { target: { value: "Salad" } });
    view.rerender(
      <MealForm
        dayIso="2026-10-07"
        macroOrder={[...macros]}
        onPrefillConsumed={onConsumed}
        prefill={{
          description: "Rice",
          items: [
            {
              name: "Rice",
              quantity: "1 cup",
              calories: 200,
              fatGrams: 0,
              carbsGrams: 45,
              proteinGrams: 4,
            },
          ],
        }}
      />,
    );
    await waitFor(() => expect(onConsumed).toHaveBeenCalled());
    expect(screen.getByLabelText("Description")).toHaveValue("My lunch");
    expect(screen.getByLabelText("Item 1 name")).toHaveValue("Salad");
    expect(screen.getByLabelText("Item 2 name")).toHaveValue("Rice");
    expect(screen.getByLabelText("Item 2 calories (kcal)")).toHaveValue(200);
  });
});
