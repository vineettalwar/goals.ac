ALTER TABLE "publish_records" ADD COLUMN "quality_score" integer;--> statement-breakpoint
ALTER TABLE "publish_records" ADD COLUMN "readiness_blockers" jsonb;--> statement-breakpoint
ALTER TABLE "publish_records" ADD COLUMN "readiness_warnings" jsonb;