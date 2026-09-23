import type { PeptideDoseUnit } from "@/db/schema";

/** Converts a dose amount to micrograms. Returns null for "iu"/"ml" — those aren't mass units, so
 * reconstitution math (which is purely mass-in-powder ÷ volume-of-water) doesn't apply to them. */
function toMicrograms(amount: number, unit: PeptideDoseUnit): number | null {
  if (unit === "mcg") return amount;
  if (unit === "mg") return amount * 1000;
  return null;
}

export type ReconstitutionInput = {
  vialAmountMg: number | null;
  bacWaterMl: number | null;
  doseAmount: number;
  doseUnit: PeptideDoseUnit;
};

/** How many mL to draw for one dose, given a vial's powder amount, how much bacteriostatic/sterile
 * water was mixed in, and the target dose. Null if either reconstitution input is missing, not
 * positive, or the dose unit isn't a mass unit (iu/ml are dosed directly, not reconstituted). */
export function computeDrawVolumeMl(input: ReconstitutionInput): number | null {
  const { vialAmountMg, bacWaterMl, doseAmount, doseUnit } = input;
  if (!vialAmountMg || vialAmountMg <= 0 || !bacWaterMl || bacWaterMl <= 0) return null;

  const doseMcg = toMicrograms(doseAmount, doseUnit);
  if (doseMcg === null) return null;

  const concentrationMcgPerMl = (vialAmountMg * 1000) / bacWaterMl;
  return doseMcg / concentrationMcgPerMl;
}

/** mL drawn on a standard U-100 insulin syringe, read as syringe units (100 units per mL). */
export function mlToSyringeUnits(ml: number): number {
  return ml * 100;
}
