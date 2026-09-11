import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { processReconciliationJob } from "../../application/services/process-reconciliation-job.js";
import { db, pool } from "../../infrastructure/database/client.js";
import {
  importBatches,
  reconciliationJobs,
  reconciliationJobTransactions,
  reconciliationResults,
  reconciliationResultTransactions,
  transactions,
  transactionSources,
} from "../../infrastructure/database/schema.js";

describe("processReconciliationJob - exception", () => {
  beforeEach(async () => {
    await db.delete(reconciliationResultTransactions);
    await db.delete(reconciliationResults);
    await db.delete(reconciliationJobTransactions);
    await db.delete(reconciliationJobs);
    await db.delete(transactions);
    await db.delete(importBatches);
    await db.delete(transactionSources);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates a exception result when a counterpart exists but does not satisfy the reconciliation rules", async () => {
    const [source] = await db
      .insert(transactionSources)
      .values({
        name: "Exception Test Payment Source",
        sourceType: "payment",
        status: "active",
      })
      .returning();

    if (!source) {
      throw new Error("Failed to create test transaction source");
    }

    const [batch] = await db
      .insert(importBatches)
      .values({
        sourceId: source.id,
        status: "completed",
        totalRecords: 1,
        validRecords: 1,
        invalidRecords: 0,
        completedAt: new Date(),
      })
      .returning();

    if (!batch) {
      throw new Error("Failed to create test import batch");
    }

    const [transaction] = await db
      .insert(transactions)
      .values({
        importBatchId: batch.id,
        sourceId: source.id,
        externalTransactionId: "PAY-TEST-EXCEPTION-1001",
        reference: "ORDER-TEST-EXCEPTION-1001",
        amountMinor: 12500,
        currency: "USD",
        transactionType: "payment",
        status: "captured",
        occurredAt: new Date(),
      })
      .returning();

    if (!transaction) {
      throw new Error("Failed to create test transaction");
    }

    const [settlementSource] = await db
      .insert(transactionSources)
      .values({
        name: "Exception Test Settlement Source",
        sourceType: "settlement",
        status: "active",
      })
      .returning();

    if (!settlementSource) {
      throw new Error("Failed to create settlement test source");
    }

    const [settlementBatch] = await db
      .insert(importBatches)
      .values({
        sourceId: settlementSource.id,
        status: "completed",
        totalRecords: 1,
        validRecords: 1,
        invalidRecords: 0,
        completedAt: new Date(),
      })
      .returning();

    if (!settlementBatch) {
      throw new Error("Failed to create settlement test batch");
    }

    const [settlementTransaction] = await db
      .insert(transactions)
      .values({
        importBatchId: settlementBatch.id,
        sourceId: settlementSource.id,
        externalTransactionId: "SET-TEST-EXCEPTION-1001",
        reference: "ORDER-TEST-EXCEPTION-1001",
        amountMinor: 12500,
        currency: "USD",
        transactionType: "settlement",
        status: "pending",
        occurredAt: new Date(),
      })
      .returning();

    if (!settlementTransaction) {
      throw new Error("Failed to create settlement test transaction");
    }

    const [job] = await db
      .insert(reconciliationJobs)
      .values({
        status: "processing",
        idempotencyKey: `test:${transaction.id}:exception`,
        attemptCount: 1,
        startedAt: new Date(),
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create test reconciliation job");
    }

    await db.insert(reconciliationJobTransactions).values({
      reconciliationJobId: job.id,
      transactionId: transaction.id,
    });

    const result = await processReconciliationJob(job.id, [{ transaction }]);

    expect(result).toBeDefined();

    expect(result.outcome).toBe("exception");

    expect(result.ruleCode).toBe("COUNTERPART_MISMATCH");

    const associations = await db
      .select()
      .from(reconciliationResultTransactions)
      .where(
        eq(reconciliationResultTransactions.reconciliationResultId, result.id),
      );

    expect(associations).toHaveLength(2);

    const associatedTransactionIds = associations.map(
      (association) => association.transactionId,
    );

    expect(associatedTransactionIds).toContain(transaction.id);

    expect(associatedTransactionIds).toContain(settlementTransaction.id);

    const [completedJob] = await db
      .select()
      .from(reconciliationJobs)
      .where(eq(reconciliationJobs.id, job.id));

    expect(completedJob?.status).toBe("completed");
    expect(completedJob?.completedAt).not.toBeNull();
  });
});
