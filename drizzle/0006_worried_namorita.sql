CREATE TYPE "public"."reconciliation_outcome" AS ENUM('matched', 'pending', 'exception');--> statement-breakpoint
CREATE TABLE "reconciliation_result_transactions" (
	"reconciliation_result_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_job_id" uuid NOT NULL,
	"outcome" "reconciliation_outcome" NOT NULL,
	"rule_code" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reconciliation_result_transactions" ADD CONSTRAINT "reconciliation_result_transactions_reconciliation_result_id_reconciliation_results_id_fk" FOREIGN KEY ("reconciliation_result_id") REFERENCES "public"."reconciliation_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_result_transactions" ADD CONSTRAINT "reconciliation_result_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_results_reconciliation_job_id_reconciliation_jobs_id_fk" FOREIGN KEY ("reconciliation_job_id") REFERENCES "public"."reconciliation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reconciliation_result_transactions_unique" ON "reconciliation_result_transactions" USING btree ("reconciliation_result_id","transaction_id");--> statement-breakpoint
CREATE INDEX "reconciliation_results_job_id_idx" ON "reconciliation_results" USING btree ("reconciliation_job_id");--> statement-breakpoint
CREATE INDEX "reconciliation_results_outcome_idx" ON "reconciliation_results" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "reconciliation_results_created_at_idx" ON "reconciliation_results" USING btree ("created_at");