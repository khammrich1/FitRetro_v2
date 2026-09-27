/** One editable row in the meal-prep ingredient list. Strings, because they back form inputs. */
export type EditableItem = {
  name: string;
  quantity: string;
  calories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatGrams: string;
};

export const blankItem: EditableItem = {
  name: "",
  quantity: "",
  calories: "",
  proteinGrams: "",
  carbsGrams: "",
  fatGrams: "",
};

export function isBlankItem(item: EditableItem): boolean {
  return Object.values(item).every((value) => value.trim() === "");
}

/** Adds newly estimated ingredients after the ones already in the batch — an estimate never
 * replaces or edits existing rows. Untouched blank rows (like the empty starter row) are
 * dropped so they don't sit between real ingredients. */
export function appendItems(current: EditableItem[], added: EditableItem[]): EditableItem[] {
  const kept = current.filter((item) => !isBlankItem(item));
  const next = [...kept, ...added];
  return next.length > 0 ? next : [{ ...blankItem }];
}

/** Removes one row; removing the last one leaves a single blank row to type into. */
export function removeItemAt(current: EditableItem[], index: number): EditableItem[] {
  const next = current.filter((_, i) => i !== index);
  return next.length > 0 ? next : [{ ...blankItem }];
}
