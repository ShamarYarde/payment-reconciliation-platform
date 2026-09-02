ALTER TABLE "reconciliation_jobs" RENAME COLUMN "createed_at" TO "created_at";--> statement-breakpoint
DROP INDEX "reconciliation_jobs_created_at_idx";--> statement-breakpoint
CREATE INDEX "reconciliation_jobs_created_at_idx" ON "reconciliation_jobs" USING btree ("created_at");