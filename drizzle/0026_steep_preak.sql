CREATE TYPE "public"."reading_topic" AS ENUM('self_help', 'leadership', 'discipline', 'time_management');--> statement-breakpoint
CREATE TABLE "daily_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" date NOT NULL,
	"topic" "reading_topic" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reading_topics" text;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_readings_day_topic_idx" ON "daily_readings" USING btree ("day","topic");