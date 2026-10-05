CREATE TABLE "daily_reading_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" date NOT NULL,
	"topic" "reading_topic" NOT NULL,
	"claimed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reading_jobs_day_topic_idx" ON "daily_reading_jobs" USING btree ("day","topic");