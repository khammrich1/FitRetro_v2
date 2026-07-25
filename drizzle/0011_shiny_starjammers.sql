ALTER TABLE "workout_templates" ADD COLUMN "sort_order" integer;--> statement-breakpoint
UPDATE "workout_templates" AS wt
SET "sort_order" = sub.rn
FROM (
	SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at") - 1 AS rn
	FROM "workout_templates"
) AS sub
WHERE wt."id" = sub."id";--> statement-breakpoint
ALTER TABLE "workout_templates" ALTER COLUMN "sort_order" SET NOT NULL;
