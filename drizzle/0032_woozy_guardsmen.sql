DROP INDEX "progress_photos_user_day_pose_idx";--> statement-breakpoint
CREATE INDEX "progress_photos_user_day_idx" ON "progress_photos" USING btree ("user_id","taken_on");