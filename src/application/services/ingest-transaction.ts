import { and, eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/client.js";
import {
  importBatches,
  reconciliationJobs,
  reconciliationJobTransactions,
  reconciliationResults,
  reconciliationResultTransactions,
  transactions,
  transactionSources,
} from "../../infrastructure/database/schema.js";

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

function getCounterpartType(
  transactionType: "payment" | "settlement" | "refund",
) {
  switch (transactionType) {
    case "payment":
      return "settlement";

    case "settlement":
      return "payment";

    default:
      return null;
  }
}

async function findPendingCounterpart(
  tx: any,
  transaction: typeof transactions.$inferSelect,
) {
  if (!transaction.reference) {
    return null;
  }

  const counterPartType = getCounterpartType(transaction.transactionType);

  if (!counterPartType) {
    return null;
  }

  const [result] = await tx
    .select({
      transaction: transactions,
    })
    .from(transactions)
    .innerJoin(
      reconciliationResultTransactions,
      eq(reconciliationResultTransactions.transactionId, transactions.id),
    )
    .innerJoin(
      reconciliationResults,
      eq(
        reconciliationResultTransactions.reconciliationResultId,
        reconciliationResults.id,
      ),
    )
    .where(
      and(
        eq(reconciliationResults.outcome, "pending"),
        eq(transactions.reference, transaction.reference),
        eq(transactions.currency, transaction.currency),
        eq(transactions.amountMinor, transaction.amountMinor),
        eq(transactions.transactionType, counterPartType),
      ),
    )
    .limit(1);

  return result?.transaction ?? null;
}

export async function createReconciliationJob(
  tx: any,
  transactionIds: string[],
) {
  const sortedIds = [...transactionIds].sort();

  const idempotencyKey =
    transactionIds.length === 1
      ? `transaction:${transactionIds[0]}:initial-reconciliation`
      : `reconciliation:${sortedIds.join(":")}`;

  const [job] = await tx
    .insert(reconciliationJobs)
    .values({
      status: "pending",
      idempotencyKey,
      attemptCount: 0,
    })
    .returning();

  if (!job) {
    throw new Error("Failed to create reconciliation job");
  }

  await tx.insert(reconciliationJobTransactions).values(
    transactionIds.map((transactionId) => ({
      reconciliationJobId: job.id,
      transactionId,
    })),
  );

  return job;
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
        reReconciliation: false
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

    const counterpart = await findPendingCounterpart(tx, transaction);

    if (counterpart) {
      const job = await createReconciliationJob(tx, [
        counterpart.id,
        transaction.id,
      ]);

      return {
        transaction,
        reconciliationJob: job,
        created: true,
        reReconciliation: true,
      };
    }

    const job = await createReconciliationJob(tx, [transaction.id]);

    return {
      transaction,
      reconciliationJob: job,
      created: true,
      reReconciliation: false,
    };
  });
}
