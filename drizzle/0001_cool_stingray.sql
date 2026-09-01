CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_transaction_id" text NOT NULL,
	"reference" text,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"transaction_type" text NOT NULL,
	"status" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_sources" ADD COLUMN "source_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_sources" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_id_transaction_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."transaction_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_source_external_id_unique" ON "transactions" USING btree ("source_id","external_transaction_id");