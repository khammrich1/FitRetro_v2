const KG_PER_LB = 0.45359237;

export function lbsToKg(lbs: number) {
  return lbs * KG_PER_LB;
}

export function kgToLbs(kg: number) {
  return kg / KG_PER_LB;
}
