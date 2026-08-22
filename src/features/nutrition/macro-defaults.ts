import type { Sex } from "@/db/schema";

// "Lightly active" — a deliberately middle-of-the-road assumption since actual activity level
// isn't collected at signup. These are a starting point, not a prescription; the user can (and
// should) adjust them in Settings > Nutrition once they know how their body actually responds.
const ACTIVITY_MULTIPLIER = 1.4;
const PROTEIN_CALORIE_RATIO = 0.3;
const CARB_CALORIE_RATIO = 0.4;
const FAT_CALORIE_RATIO = 0.3;

export type DefaultMacroGoalsInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
};

export type DefaultMacroGoals = {
  dailyCalories: number;
  dailyProteinGrams: number;
  dailyCarbsGrams: number;
  dailyFatGrams: number;
};

/** Mifflin-St Jeor BMR scaled to an assumed "lightly active" TDEE, split into a standard
 * 30/40/30 protein/carb/fat ratio. */
export function calculateDefaultMacroGoals({
  sex,
  age,
  heightCm,
  weightKg,
}: DefaultMacroGoalsInput): DefaultMacroGoals {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
  const dailyCalories = Math.round((bmr * ACTIVITY_MULTIPLIER) / 10) * 10;

  return {
    dailyCalories,
    dailyProteinGrams: Math.round((dailyCalories * PROTEIN_CALORIE_RATIO) / 4),
    dailyCarbsGrams: Math.round((dailyCalories * CARB_CALORIE_RATIO) / 4),
    dailyFatGrams: Math.round((dailyCalories * FAT_CALORIE_RATIO) / 9),
  };
}
