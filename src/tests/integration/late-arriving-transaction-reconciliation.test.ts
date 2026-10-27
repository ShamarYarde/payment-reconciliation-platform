import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
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
import { runReconciliationWorkerOnce } from "../../application/services/run-reconciliation-worker-once.js";
import { ingestTransaction } from "../../application/services/ingest-transaction.js";
import { eq } from "drizzle-orm";

describe("reconciliation worker processing late arrivals", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

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

  it("reconciles a previously pending transaction when its counterpart arrives", async () => {
    // arrange source(s)
    const [source] = await db
      .insert(transactionSources)
      .values({
        name: "pending",
        sourceType: "payment",
        status: "active",
      })
      .returning();

    if (!source) {
      throw new Error("Failed to create test transaction");
    }

    // ingest/create initial payment
    const [batch] = await db
      .insert(importBatches)
      .values({
        sourceId: source.id,
        status: "completed",
        totalRecords: 1,
        validRecords: 1,
        invalidRecords: 0,
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
        externalTransactionId: "PAY-TEST-LATE-1001",
        reference: "ORDER-TEST-LATE-1001",
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
        name: "Pending Test Settlement Source",
        sourceType: "settlement",
        status: "active",
      })
      .returning();

    if (!settlementSource) {
      throw new Error("Failed to create settlement test source");
    }

    const [job] = await db
      .insert(reconciliationJobs)
      .values({
        status: "pending",
        idempotencyKey: `test:${transaction.id}:initial-reconciliation`,
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

    // run worker
    await runReconciliationWorkerOnce();

    // assert first result is pending

    const [pendingResult] = await db
      .select()
      .from(reconciliationResults)
      .where(eq(reconciliationResults.reconciliationJobId, job.id));

    expect(pendingResult?.outcome).toBe("pending");

    // ingest matching settlement through ingestTransaction()
    const lateArrival = await ingestTransaction({
      sourceId: settlementSource.id,
      externalTransactionId: "SET-TEST-LATE-1001",
      reference: "ORDER-TEST-LATE-1001",
      amountMinor: 12500,
      currency: "USD",
      transactionType: "settlement",
      status: "settled",
      occurredAt: new Date(),
    });

    // assert a new reconciliation job was created
    expect(lateArrival.reconciliationJob).not.toBeNull();
    expect(lateArrival.reReconciliation).toBe(true);

    // run worker again
    await runReconciliationWorkerOnce();

    // assert new result is matched
    const [matchedResult] = await db
      .select()
      .from(reconciliationResults)
      .where(eq(reconciliationResults.reconciliationJobId, lateArrival.reconciliationJob!.id));

    expect(matchedResult?.outcome).toBe("matched");

    if (!matchedResult) {
      throw new Error("Failed to create matched reconciliation result");
    }

    // assert original pending result still exists
    const [preservedPendingResult] = await db
      .select()
      .from(reconciliationResults)
      .where(eq(reconciliationResults.id, pendingResult!.id));

    expect(preservedPendingResult?.outcome).toBe("pending");

    // assert matched result links both transactions
    const associations = await db
      .select()
      .from(reconciliationResultTransactions)
      .where(
        eq(
          reconciliationResultTransactions.reconciliationResultId,
          matchedResult.id,
        ),
      );

    const associatedTransactionIds = associations.map(
      (association) => association.transactionId,
    );

    expect(new Set(associatedTransactionIds)).toEqual(
      new Set([transaction.id, lateArrival.transaction.id]),
    );
  });
});
