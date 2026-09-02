import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const transactionSourceTypeEnum = pgEnum("transaction_source_type", [
  "payment",
  "settlement",
  "internal",
]);

export const transactionSourceStatusEnum = pgEnum("transaction_source_status", [
  "active",
  "inactive",
]);

export const importBatchStatusEnum = pgEnum("import_batch_status", [
  "received",
  "validating",
  "completed",
  "partially_completed",
  "failed",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "payment",
  "settlement",
  "refund",
]);

export const transactionSources = pgTable("transaction_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  sourceType: transactionSourceTypeEnum("source_type").notNull(),
  status: transactionSourceStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => transactionSources.id),
    externalBatchReference: text("external_batch_reference"),
    status: importBatchStatusEnum("status").notNull(),
    totalRecords: integer("total_records").notNull(),
    validRecords: integer("valid_records").notNull(),
    invalidRecords: integer("invalid_records").notNull(),
    importedAt: timestamp("imported_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    check(
      "import_batches_total_records_non_negative",
      sql`${table.totalRecords} >= 0`,
    ),
    check(
      "import_batches_valid_records_non_negative",
      sql`${table.validRecords} >= 0`,
    ),
    check(
      "import_batches_invalid_records_non_negative",
      sql`${table.invalidRecords} >= 0`,
    ),
    check(
      "import_batchs_record_counts_valid",
      sql`${table.validRecords} + ${table.invalidRecords} <= ${table.totalRecords}`,
    ),
    index("import_batches_source_id_idx").on(table.sourceId),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importBatchId: uuid("import_batch_id")
      .notNull()
      .references(() => importBatches.id),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => transactionSources.id),
    externalTransactionId: text("external_transaction_id").notNull(),
    reference: text("reference"),
    amountMinor: bigint("amount_minor", {
      mode: "number",
    }).notNull(),
    currency: varchar("currency", {
      length: 3,
    }).notNull(),
    transactionType: transactionTypeEnum("transaction_type").notNull(),
    status: text("status").notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
    }).notNull(),
    importedAt: timestamp("imported_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    rawSourceData: jsonb("raw_source_data"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("transactions_source_external_id_unique").on(
      table.sourceId,
      table.externalTransactionId,
    ),
    index("transactions_external_transaction_id_idx").on(
      table.externalTransactionId,
    ),
    index("transactions_reference_idx").on(table.reference),
    index("transactions_currency_idx").on(table.currency),
    index("transactions_status_idx").on(table.status),
    index("transactions_reference_currency_amount_idx").on(
      table.reference,
      table.currency,
      table.amountMinor,
    ),
  ],
);

export const reconciliationJobStatusEnum = pgEnum("reconciliation_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const reconciliationJobs = pgTable(
  "reconciliation_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: reconciliationJobStatusEnum("status").notNull().default("pending"),
    idempotencyKey: text("idempotency_key").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),
    failedAt: timestamp("failed_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    uniqueIndex("reconciliation_jobs_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("reconciliation_job_status_idx").on(table.status),
    index("reconciliation_jobs_created_at_idx").on(table.createdAt),
  ],
);

export const reconciliationJobTransactions = pgTable(
  "reconciliation_job_transactions",
  {
    reconciliationJobId: uuid("reconciliation_job_id")
      .notNull()
      .references(() => reconciliationJobs.id),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("reconciliation_job_transactions_unique").on(
      table.reconciliationJobId,
      table.transactionId,
    ),
  ],
);
