ALTER TABLE "reeconciliation_job_transactions" RENAME TO "reconciliation_job_transactions";--> statement-breakpoint
ALTER TABLE "reconciliation_job_transactions" DROP CONSTRAINT "reeconciliation_job_transactions_reconciliation_job_id_reconciliation_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "reconciliation_job_transactions" DROP CONSTRAINT "reeconciliation_job_transactions_transaction_id_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "reconciliation_job_transactions" ADD CONSTRAINT "reconciliation_job_transactions_reconciliation_job_id_reconciliation_jobs_id_fk" FOREIGN KEY ("reconciliation_job_id") REFERENCES "public"."reconciliation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_job_transactions" ADD CONSTRAINT "reconciliation_job_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;