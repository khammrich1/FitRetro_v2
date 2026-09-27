import { describe, expect, it } from "vitest";
import {
  appendItems,
  blankItem,
  isBlankItem,
  removeItemAt,
  type EditableItem,
} from "./ingredients";

const greenBeans: EditableItem = {
  name: "green beans",
  quantity: "40g",
  calories: "12",
  proteinGrams: "0.7",
  carbsGrams: "2.8",
  fatGrams: "0.1",
};
const eggWhites: EditableItem = {
  name: "egg whites",
  quantity: "14 large",
  calories: "238",
  proteinGrams: "50.4",
  carbsGrams: "3.4",
  fatGrams: "0.8",
};

describe("appendItems", () => {
  it("replaces the empty starter row with the first estimate", () => {
    expect(appendItems([{ ...blankItem }], [greenBeans])).toEqual([greenBeans]);
  });

  it("adds a later estimate after what's already there, leaving it untouched", () => {
    const afterBeans = appendItems([{ ...blankItem }], [greenBeans]);
    expect(appendItems(afterBeans, [eggWhites])).toEqual([greenBeans, eggWhites]);
  });

  it("keeps ingredients typed in by hand, including hand-edited numbers", () => {
    const handTyped = { ...greenBeans, calories: "15" };
    expect(appendItems([handTyped], [eggWhites])).toEqual([handTyped, eggWhites]);
  });

  it("keeps a partly filled row (e.g. only a name) rather than treating it as blank", () => {
    const partial = { ...blankItem, name: "olive oil" };
    expect(appendItems([partial], [eggWhites])).toEqual([partial, eggWhites]);
  });

  it("appends several items from one estimate in order", () => {
    expect(appendItems([greenBeans], [eggWhites, { ...eggWhites, name: "rice" }])).toHaveLength(3);
  });
});

describe("removeItemAt", () => {
  it("removes just the chosen row", () => {
    expect(removeItemAt([greenBeans, eggWhites], 0)).toEqual([eggWhites]);
  });

  it("leaves one blank row after removing the last ingredient", () => {
    const [only] = removeItemAt([greenBeans], 0);
    expect(isBlankItem(only)).toBe(true);
  });
});
