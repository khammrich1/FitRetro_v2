CREATE TYPE "public"."progress_photo_pose" AS ENUM('front', 'side', 'back');--> statement-breakpoint
CREATE TABLE "progress_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"taken_on" date NOT NULL,
	"pose" "progress_photo_pose" NOT NULL,
	"storage_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "progress_photos_user_day_pose_idx" ON "progress_photos" USING btree ("user_id","taken_on","pose");