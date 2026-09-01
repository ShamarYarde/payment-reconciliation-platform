CREATE TYPE "public"."import_batch_status" AS ENUM('received', 'validating', 'completed', 'partially_completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transaction_source_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."transaction_source_type" AS ENUM('payment', 'settlement', 'internal');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('payment', 'settlement', 'refund');--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_batch_reference" text,
	"status" "import_batch_status" NOT NULL,
	"total_records" integer NOT NULL,
	"valid_records" integer NOT NULL,
	"invalid_records" integer NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "import_batches_total_records_non_negative" CHECK ("import_batches"."total_records" >= 0),
	CONSTRAINT "import_batches_valid_records_non_negative" CHECK ("import_batches"."valid_records" >= 0),
	CONSTRAINT "import_batches_invalid_records_non_negative" CHECK ("import_batches"."invalid_records" >= 0),
	CONSTRAINT "import_batchs_record_counts_valid" CHECK ("import_batches"."valid_records" + "import_batches"."invalid_records" <= "import_batches"."total_records")
);
--> statement-breakpoint
ALTER TABLE "transaction_sources" ALTER COLUMN "source_type" SET DATA TYPE "public"."transaction_source_type" USING "source_type"::"public"."transaction_source_type";--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "transaction_type" SET DATA TYPE "public"."transaction_type" USING "transaction_type"::"public"."transaction_type";--> statement-breakpoint
ALTER TABLE "transaction_sources" ADD COLUMN "status" "transaction_source_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "import_batch_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "imported_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "raw_source_data" jsonb;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_source_id_transaction_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."transaction_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batches_source_id_idx" ON "import_batches" USING btree ("source_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_external_transaction_id_idx" ON "transactions" USING btree ("external_transaction_id");--> statement-breakpoint
CREATE INDEX "transactions_reference_idx" ON "transactions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "transactions_currency_idx" ON "transactions" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_reference_currency_amount_idx" ON "transactions" USING btree ("reference","currency","amount_minor");