import { pgTable, uuid, timestamp, real } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Point-in-time body measurements for progress/analytics tracking. */
export const bodyMeasurements = pgTable("body_measurements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  weightKg: real("weight_kg"),
  heightCm: real("height_cm"),
  bodyFatPercent: real("body_fat_percent"),
  waistCm: real("waist_cm"),
  chestCm: real("chest_cm"),
  hipsCm: real("hips_cm"),
});

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;
