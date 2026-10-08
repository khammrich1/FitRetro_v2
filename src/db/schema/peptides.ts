import { pgTable, uuid, text, real, pgEnum, timestamp, date, index } from "drizzle-orm/pg-core";
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
  "mon_fri",
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
  /** Reconstitution inputs, both optional and both in mg/mL — only meaningful (and only shown)
   * when doseUnit is "mg" or "mcg" (a lyophilized powder peptide), not "iu"/"ml". See
   * @/features/peptides/reconstitution for the draw-volume math. */
  vialAmountMg: real("vial_amount_mg"),
  bacWaterMl: real("bac_water_ml"),
  /** User-entered elimination half-life in hours, used only to estimate how much of a dose is
   * still active ("level in body") — see @/features/peptides/decay. Null hides that estimate for
   * this peptide entirely rather than guessing; FitRetro doesn't assert a half-life on the
   * user's behalf. */
  halfLifeHours: real("half_life_hours"),
  /** Set instead of deleting the row, so every dose ever logged against it stays in history.
   * Archived templates are hidden from Today and the settings list (with a restore option). */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** A single logged dose of a peptide on a given calendar day. */
export const peptideLogs = pgTable(
  "peptide_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    peptideTemplateId: uuid("peptide_template_id")
      .references(() => peptideTemplates.id, { onDelete: "cascade" })
      .notNull(),
    loggedOn: date("logged_on").notNull(),
    /** When the row was created. Not the dose time — see administeredAt. (Rows from before
     * migration 0028 were stamped with that migration's run time, so for them it means nothing.) */
    loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
    /** The actual moment the dose was taken, used by the "level in body" estimate. Null means
     * unknown — a backdated dose logged without a time, or a legacy row whose logged_at was
     * clearly not the dose time — and unknown doses are left out of the estimate rather than
     * guessed. */
    administeredAt: timestamp("administered_at", { withTimezone: true }),
    /** Snapshot of the template at the moment of logging, so editing the template later never
     * rewrites history ("5mg" stays "5mg"). Null only on rows from before these columns existed,
     * which the migration backfills from the template; code falls back to the template anyway. */
    name: text("name"),
    doseAmount: real("dose_amount"),
    doseUnit: peptideDoseUnitEnum("dose_unit"),
  },
  (table) => [index("peptide_logs_logged_on_idx").on(table.loggedOn)],
);

export type PeptideTemplate = typeof peptideTemplates.$inferSelect;
export type NewPeptideTemplate = typeof peptideTemplates.$inferInsert;
export type PeptideLog = typeof peptideLogs.$inferSelect;
export type NewPeptideLog = typeof peptideLogs.$inferInsert;
