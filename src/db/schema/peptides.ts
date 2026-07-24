import { pgTable, uuid, text, real, pgEnum, timestamp, date } from "drizzle-orm/pg-core";
import { users } from "./users";

export const peptideDoseUnitEnum = pgEnum("peptide_dose_unit", ["mcg", "mg", "iu", "ml"]);
export type PeptideDoseUnit = (typeof peptideDoseUnitEnum.enumValues)[number];

export const peptideFrequencyEnum = pgEnum("peptide_frequency", [
  "daily",
  "every_other_day",
  "twice_weekly",
  "three_times_weekly",
  "weekly",
  "as_needed",
]);
export type PeptideFrequency = (typeof peptideFrequencyEnum.enumValues)[number];

/** A user-defined peptide the user takes, with a standard dose and frequency (reference/label
 * only — frequency isn't used to compute due dates, at least not yet). */
export const peptideTemplates = pgTable("peptide_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  doseAmount: real("dose_amount").notNull(),
  doseUnit: peptideDoseUnitEnum("dose_unit").notNull(),
  frequency: peptideFrequencyEnum("frequency").notNull(),
  /** Preferred time of day to take it, stored as 24-hour "HH:MM" (from a native time input);
   * reference/label only, same as frequency — not used for reminders. */
  preferredTime: text("preferred_time"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** A single logged dose of a peptide on a given calendar day. */
export const peptideLogs = pgTable("peptide_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  peptideTemplateId: uuid("peptide_template_id")
    .references(() => peptideTemplates.id, { onDelete: "cascade" })
    .notNull(),
  loggedOn: date("logged_on").notNull(),
});

export type PeptideTemplate = typeof peptideTemplates.$inferSelect;
export type NewPeptideTemplate = typeof peptideTemplates.$inferInsert;
export type PeptideLog = typeof peptideLogs.$inferSelect;
export type NewPeptideLog = typeof peptideLogs.$inferInsert;
