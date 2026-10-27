import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("../../application/services/process-reconciliation-job.ts", () => ({
  processReconciliationJob: vi.fn(),
}));

import { processReconciliationJob } from "../../application/services/process-reconciliation-job.js";
import {
  runReconciliationWorkerOnce,
} from "../../application/services/run-reconciliation-worker-once.js";
import { db, pool } from "../../infrastructure/database/client.js";
import {
  reconciliationJobs,
  reconciliationJobTransactions,
  reconciliationResultTransactions,
  reconciliationResults,
  transactions,
  importBatches,
  transactionSources,
} from "../../infrastructure/database/schema.js";

describe("reconciliation worker retries", () => {
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

  it("requeues the job after the first failure", async () => {
    const [job] = await db
      .insert(reconciliationJobs)
      .values({
        status: "pending",
        idempotencyKey: "test:first-failure",
        attemptCount: 0,
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create test reconciliation job");
    }

    vi.mocked(processReconciliationJob).mockRejectedValueOnce(
      new Error("Simulated processing failure"),
    );

    await expect(runReconciliationWorkerOnce()).rejects.toThrow(
      "Simulated processing failure",
    );

    const [updatedJob] = await db
      .select()
      .from(reconciliationJobs)
      .where(eq(reconciliationJobs.id, job.id));

    expect(updatedJob).toBeDefined();
    expect(updatedJob?.status).toBe("pending");
    expect(updatedJob?.attemptCount).toBe(1);
    expect(updatedJob?.failedAt).toBeNull();
    expect(updatedJob?.failureCode).toBeNull();
    expect(updatedJob?.failureMessage).toBeNull();
  });

  it("requeues the job after the second failure", async () => {
    const [job] = await db
      .insert(reconciliationJobs)
      .values({
        status: "pending",
        idempotencyKey: "test:second-failure",
        attemptCount: 1,
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create test reconciliation job");
    }

    vi.mocked(processReconciliationJob).mockRejectedValueOnce(
      new Error("Simulated processing failure"),
    );

    await expect(runReconciliationWorkerOnce()).rejects.toThrow(
      "Simulated processing failure",
    );

    const [updatedJob] = await db
      .select()
      .from(reconciliationJobs)
      .where(eq(reconciliationJobs.id, job.id));

    expect(updatedJob).toBeDefined();
    expect(updatedJob?.status).toBe("pending");
    expect(updatedJob?.attemptCount).toBe(2);
    expect(updatedJob?.failedAt).toBeNull();
    expect(updatedJob?.failureCode).toBeNull();
    expect(updatedJob?.failureMessage).toBeNull();
  });

  it("marks the job as failed after the third failure", async () => {
    const [job] = await db
      .insert(reconciliationJobs)
      .values({
        status: "pending",
        idempotencyKey: "test:third-failure",
        attemptCount: 2,
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create test reconciliation job");
    }

    vi.mocked(processReconciliationJob).mockRejectedValueOnce(
      new Error("Simulated processing failure"),
    );

    await expect(runReconciliationWorkerOnce()).rejects.toThrow(
      "Simulated processing failure",
    );

    const [updatedJob] = await db
      .select()
      .from(reconciliationJobs)
      .where(eq(reconciliationJobs.id, job.id));

    expect(updatedJob).toBeDefined();
    expect(updatedJob?.status).toBe("failed");
    expect(updatedJob?.attemptCount).toBe(3);
    expect(updatedJob?.failedAt).not.toBeNull();
    expect(updatedJob?.failureCode).toBe("PROCESSING_ERROR");
    expect(updatedJob?.failureMessage).toBe("Simulated processing failure");
  });
});
