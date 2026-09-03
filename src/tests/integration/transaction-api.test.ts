import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

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

describe("POST /api/v1/transactions", () => {
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

  it("creates a tranasaction and reconciliation job", async () => {
    const [source] = await db
      .insert(transactionSources)
      .values({
        name: "API Test Payment Source",
        sourceType: "payment",
        status: "active",
      })
      .returning();

    if (!source) {
      throw new Error("Failed to create test source");
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      payload: {
        sourceId: source.id,
        externalTransactionId: "PAY-API-TEST-1001",
        reference: "ORDER-API-TEST-1001",
        amountMinor: 12500,
        currency: "USD",
        transactionType: "payment",
        status: "captured",
        occurredAt: "2026-09-03T12:00:00Z",
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.created).toBe(true);

    expect(body.transaction).toBeDefined();
    expect(body.transaction.externalTransactionId).toBe("PAY-API-TEST-1001");

    expect(body.reconciliationJob).toBeDefined();
    expect(body.reconciliationJob.status).toBe("pending");

    const [storedTransaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.externalTransactionId, "PAY-API-TEST-1001"));

    expect(storedTransaction).toBeDefined();

    const [storedJob] = await db
      .select()
      .from(reconciliationJobs)
      .where(eq(reconciliationJobs.id, body.reconciliationJob.id));

    expect(storedJob?.status).toBe("pending");
  });
});
