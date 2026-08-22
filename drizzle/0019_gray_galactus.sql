CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sex" "sex";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "age" integer;