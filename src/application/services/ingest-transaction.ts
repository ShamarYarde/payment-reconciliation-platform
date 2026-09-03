import { and, eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/client.js";
import {
  importBatches,
  reconciliationJobs,
  reconciliationJobTransactions,
  transactions,
  transactionSources,
} from "../../infrastructure/database/schema.js";
import { findTransactionSourceById } from "../../infrastructure/database/repositories/transaction-source-repository.js";
import { createImportBatch } from "../../infrastructure/database/repositories/import-batch-repository.js";
import {
  createTransaction,
  findTransactionByExternalId,
} from "../../infrastructure/database/repositories/transaction-repository.js";

export interface IngestTransactionInput {
  sourceId: string;
  externalTransactionId: string;
  reference?: string;
  amountMinor: number;
  currency: string;
  transactionType: "payment" | "settlement" | "refund";
  status: string;
  occurredAt: Date;
  rawSourceData?: unknown;
}

export async function ingestTransaction(input: IngestTransactionInput) {
  return db.transaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(transactionSources)
      .where(eq(transactionSources.id, input.sourceId))
      .limit(1);

    if (!source) {
      throw new Error("Transaction source not found");
    }

    const [existingTransaction] = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.sourceId, input.sourceId),
          eq(transactions.externalTransactionId, input.externalTransactionId),
        ),
      )
      .limit(1);

    if (existingTransaction) {
      return {
        transaction: existingTransaction,
        reconciliationJob: null,
        created: false,
      };
    }

    const [batch] = await tx
      .insert(importBatches)
      .values({
        sourceId: input.sourceId,
        status: "completed",
        totalRecords: 1,
        validRecords: 1,
        invalidRecords: 0,
        completedAt: new Date(),
      })
      .returning();

    if (!batch) {
      throw new Error("Failed to create import batch");
    }

    const [transaction] = await tx
      .insert(transactions)
      .values({
        importBatchId: batch.id,
        sourceId: input.sourceId,
        externalTransactionId: input.externalTransactionId,
        reference: input.reference,
        amountMinor: input.amountMinor,
        currency: input.currency,
        transactionType: input.transactionType,
        status: input.status,
        occurredAt: input.occurredAt,
        rawSourceData: input.rawSourceData,
      })
      .returning();

    if (!transaction) {
      throw new Error("Failed to create transaction");
    }

    const idempotencyKey = `transaction:${transaction.id}:initial-reconciliation`;

    const [job] = await tx
      .insert(reconciliationJobs)
      .values({
        status: "pending",
        idempotencyKey,
        attemptCount: 0,
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create reconciliation jobs");
    }

    await tx.insert(reconciliationJobTransactions).values({
      reconciliationJobId: job.id,
      transactionId: transaction.id,
    });

    return {
      transaction,
      reconciliationJob: job,
      created: true,
    };
  });
}
