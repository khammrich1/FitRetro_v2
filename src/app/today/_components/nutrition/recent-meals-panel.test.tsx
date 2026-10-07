import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NutritionEntryWithItems } from "@/features/nutrition";
import { RecentMealsPanel } from "./recent-meals-panel";

function meal(id: string, description = "Usual lunch"): NutritionEntryWithItems {
  return {
    id,
    userId: "member",
    loggedAt: new Date(),
    mealType: "lunch",
    recipeId: null,
    description,
    calories: 400,
    proteinGrams: 30,
    carbsGrams: 40,
    fatGrams: 10,
    items: [],
  };
}
describe("recent meal shortcuts", () => {
  it("stages legacy meal totals for review, without submitting a meal", () => {
    const onChoose = vi.fn();
    render(<RecentMealsPanel entries={[meal("1")]} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Usual lunch to meal draft" }));
    expect(onChoose).toHaveBeenCalledWith({
      description: "Usual lunch",
      items: [
        {
          name: "Usual lunch",
          quantity: "",
          calories: 400,
          proteinGrams: 30,
          carbsGrams: 40,
          fatGrams: 10,
        },
      ],
    });
  });
  it("deduplicates repeats but keeps different portions, and limits choices to six", () => {
    const entries = [
      meal("1"),
      meal("2"),
      { ...meal("3"), calories: 800 },
      ...Array.from({ length: 8 }, (_, i) => meal(String(i + 4), `Meal ${i}`)),
    ];
    render(<RecentMealsPanel entries={entries} onChoose={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: "Add Usual lunch to meal draft" })).toHaveLength(
      2,
    );
  });
  it("keeps itemized quantities and macros without copying saved item identifiers", () => {
    const entry = meal("1");
    entry.items = [
      {
        id: "old-item",
        entryId: "1",
        name: "Rice",
        quantity: "1 cup",
        calories: 200,
        proteinGrams: 4,
        carbsGrams: 45,
        fatGrams: 0,
      },
    ];
    const onChoose = vi.fn();
    render(<RecentMealsPanel entries={[entry]} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChoose.mock.calls[0][0].items).toEqual([
      {
        name: "Rice",
        quantity: "1 cup",
        calories: 200,
        proteinGrams: 4,
        carbsGrams: 45,
        fatGrams: 0,
      },
    ]);
  });
  it("does not show an empty shortcut panel", () => {
    const { container } = render(<RecentMealsPanel entries={[]} onChoose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
