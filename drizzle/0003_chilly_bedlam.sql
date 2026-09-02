CREATE TYPE "public"."reconciliation_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "reeconciliation_job_transactions" (
	"reconciliation_job_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "reconciliation_job_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"failure_code" text,
	"failure_message" text,
	"createed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reeconciliation_job_transactions" ADD CONSTRAINT "reeconciliation_job_transactions_reconciliation_job_id_reconciliation_jobs_id_fk" FOREIGN KEY ("reconciliation_job_id") REFERENCES "public"."reconciliation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reeconciliation_job_transactions" ADD CONSTRAINT "reeconciliation_job_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reconciliation_job_transactions_unique" ON "reeconciliation_job_transactions" USING btree ("reconciliation_job_id","transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reconciliation_jobs_idempotency_key_unique" ON "reconciliation_jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "reconciliation_job_status_idx" ON "reconciliation_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reconciliation_jobs_created_at_idx" ON "reconciliation_jobs" USING btree ("createed_at");