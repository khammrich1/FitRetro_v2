const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}
