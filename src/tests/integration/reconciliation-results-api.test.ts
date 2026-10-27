import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
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

describe("GET /api/v1/reconciliation-results", () => {
  const app = buildApp();

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
    await app.close();
    await pool.end();
  });

  it("returns a reconciliation result with its associated transactions", async () => {
    const [source] = await db
      .insert(transactionSources)
      .values({
        name: "Rsult API Test Payment Source",
        sourceType: "payment",
        status: "active",
      })
      .returning();

    if (!source) {
      throw new Error("Failed to create test source");
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
        sourceId: source.id,
        importBatchId: batch.id,
        externalTransactionId: "PAY-RESULT-API-1001",
        reference: "ORDER-RESULT-API-1001",
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

    const [job] = await db
      .insert(reconciliationJobs)
      .values({
        status: "completed",
        idempotencyKey: `test:${transaction.id}:result-api`,
        attemptCount: 1,
        startedAt: new Date(),
        completedAt: new Date(),
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create test reconciliation job");
    }

    const [result] = await db
      .insert(reconciliationResults)
      .values({
        reconciliationJobId: job.id,
        outcome: "pending",
        ruleCode: "NO_COUNTERPART_FOUND",
        reason: "No matching counterpart transaction was found.",
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create test reconciliation result");
    }

    await db.insert(reconciliationResultTransactions).values({
      reconciliationResultId: result.id,
      transactionId: transaction.id,
      role: "source",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/reconciliation-results/${result.id}`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.id).toBe(result.id);
    expect(body.reconciliationJobId).toBe(job.id);
    expect(body.outcome).toBe("pending");
    expect(body.ruleCode).toBe("NO_COUNTERPART_FOUND");
    expect(body.reason).toBe("No matching counterpart transaction was found.");

    expect(body.transactions).toHaveLength(1);

    expect(body.transactions[0].id).toBe(transaction.id);
    expect(body.transactions[0].externalTransactionId).toBe(
      "PAY-RESULT-API-1001",
    );
    expect(body.transactions[0].role).toBe("source");
  });

  it("returns 404 when the reconciliation result does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reconciliation-results/00000000-0000-0000-0000-000000000000",
    });

    expect(response.statusCode).toBe(404);

    expect(response.json()).toEqual({
      error: "Reconciliation result not found",
    });
  });
});
