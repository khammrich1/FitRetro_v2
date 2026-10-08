import type { PeptideFrequency } from "@/db/schema";

export function peptideFrequencyLabel(frequency: PeptideFrequency): string {
  return frequency === "mon_fri" ? "Mon–Fri" : frequency.replaceAll("_", " ");
}
