import type { SupplementLogWithTemplate } from "./queries";

/** What a log should display: its own snapshot, falling back to the template only for rows the
 * migration couldn't backfill. */
export function describeLoggedSupplement(log: SupplementLogWithTemplate) {
  return {
    name: log.name ?? log.template.name,
    doseAmount: log.doseAmount ?? log.template.doseAmount,
    doseUnit: log.doseUnit ?? log.template.doseUnit,
  };
}
