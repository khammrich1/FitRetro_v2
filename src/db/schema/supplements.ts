import { pgTable, uuid, text, real, pgEnum, timestamp, date } from "drizzle-orm/pg-core";
import { users } from "./users";

export const supplementDoseUnitEnum = pgEnum("supplement_dose_unit", [
  "mg",
  "g",
  "mcg",
  "iu",
  "ml",
  "capsule",
  "tablet",
  "gummy",
  "scoop",
  "drop",
]);
export type SupplementDoseUnit = (typeof supplementDoseUnitEnum.enumValues)[number];

export const supplementFrequencyEnum = pgEnum("supplement_frequency", [
  "daily",
  "every_other_day",
  "twice_weekly",
  "three_times_weekly",
  "weekly",
  "as_needed",
]);
export type SupplementFrequency = (typeof supplementFrequencyEnum.enumValues)[number];

/** A user-defined supplement the user takes, with a standard dose and frequency (reference/label
 * only — frequency isn't used to compute due dates, at least not yet). */
export const supplementTemplates = pgTable("supplement_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  doseAmount: real("dose_amount").notNull(),
  doseUnit: supplementDoseUnitEnum("dose_unit").notNull(),
  frequency: supplementFrequencyEnum("frequency").notNull(),
  /** Preferred time of day to take it, stored as 24-hour "HH:MM" (from a native time input);
   * reference/label only, same as frequency — not used for reminders. */
  preferredTime: text("preferred_time"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** A single logged dose of a supplement on a given calendar day. */
export const supplementLogs = pgTable("supplement_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  supplementTemplateId: uuid("supplement_template_id")
    .references(() => supplementTemplates.id, { onDelete: "cascade" })
    .notNull(),
  loggedOn: date("logged_on").notNull(),
});

export type SupplementTemplate = typeof supplementTemplates.$inferSelect;
export type NewSupplementTemplate = typeof supplementTemplates.$inferInsert;
export type SupplementLog = typeof supplementLogs.$inferSelect;
export type NewSupplementLog = typeof supplementLogs.$inferInsert;
