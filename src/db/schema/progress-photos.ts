import { pgTable, uuid, text, integer, date, pgEnum, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const progressPhotoPoseEnum = pgEnum("progress_photo_pose", ["front", "side", "back"]);
export type ProgressPhotoPose = (typeof progressPhotoPoseEnum.enumValues)[number];

/** One progress photo. Every photo is kept — several of the same pose on one day (retakes) all
 * stay until the user explicitly removes one. The image itself lives in private object storage (see @/lib/object-storage); these rows only
 * hold its keys. Photos are only ever served back to their owner via /progress/photos/[id]. */
export const progressPhotos = pgTable(
  "progress_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    takenOn: date("taken_on").notNull(),
    pose: progressPhotoPoseEnum("pose").notNull(),
    /** Object key of the full-size (max 1600px) JPEG, EXIF/GPS stripped. */
    storageKey: text("storage_key").notNull(),
    /** Object key of the small (max 480px) thumbnail JPEG. */
    thumbKey: text("thumb_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** Combined size of the full image and thumbnail, for keeping an eye on storage use. */
    bytes: integer("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("progress_photos_user_day_idx").on(table.userId, table.takenOn)],
);

export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type NewProgressPhoto = typeof progressPhotos.$inferInsert;
