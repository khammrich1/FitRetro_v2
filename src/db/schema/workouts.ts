import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const muscleGroupEnum = pgEnum("muscle_group", [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "full_body",
  "cardio",
]);

export type MuscleGroup = (typeof muscleGroupEnum.enumValues)[number];

/** Catalog of known exercises, shared across all users. */
export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  muscleGroup: muscleGroupEnum("muscle_group").notNull(),
  equipment: text("equipment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** A single workout session logged by a user. */
export const workouts = pgTable("workouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** An exercise performed within a workout, in a given order. */
export const workoutExercises = pgTable("workout_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  workoutId: uuid("workout_id")
    .references(() => workouts.id, { onDelete: "cascade" })
    .notNull(),
  exerciseId: uuid("exercise_id")
    .references(() => exercises.id, { onDelete: "restrict" })
    .notNull(),
  order: integer("order").notNull(),
});

/** A single set (reps/weight/duration) within a workout exercise. */
export const workoutSets = pgTable("workout_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  workoutExerciseId: uuid("workout_exercise_id")
    .references(() => workoutExercises.id, { onDelete: "cascade" })
    .notNull(),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  durationSeconds: integer("duration_seconds"),
  rpe: real("rpe"),
});

/** The user's target muscle group(s) for a given day of the week (0 = Sunday ... 6 = Saturday). */
export const workoutSplitDays = pgTable(
  "workout_split_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    label: text("label").notNull(),
    muscleGroups: muscleGroupEnum("muscle_groups").array().notNull(),
  },
  (table) => [uniqueIndex("workout_split_days_user_day_idx").on(table.userId, table.dayOfWeek)],
);

/** A reusable, user-defined workout routine (e.g. "Chest & Tris") built from a fixed exercise list. */
export const workoutTemplates = pgTable("workout_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** One exercise slot within a workout template, with a target sets x reps scheme (e.g. "3x10"). */
export const workoutTemplateExercises = pgTable("workout_template_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .references(() => workoutTemplates.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  muscleGroup: muscleGroupEnum("muscle_group").notNull(),
  targetSetsReps: text("target_sets_reps").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
export type WorkoutSplitDay = typeof workoutSplitDays.$inferSelect;
export type NewWorkoutSplitDay = typeof workoutSplitDays.$inferInsert;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type NewWorkoutTemplate = typeof workoutTemplates.$inferInsert;
export type WorkoutTemplateExercise = typeof workoutTemplateExercises.$inferSelect;
export type NewWorkoutTemplateExercise = typeof workoutTemplateExercises.$inferInsert;
