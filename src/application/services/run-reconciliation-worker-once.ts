import { sql, eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/client.js";
import {
  reconciliationJobs,
  reconciliationJobTransactions,
  transactions,
} from "../../infrastructure/database/schema.js";
import { processReconciliationJob } from "./process-reconciliation-job.js";
import { logger } from "../../infrastructure/logging/logger.js";

const MAX_ATTEMPTS = 3;

export async function claimNextReconciliationJob() {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
        SELECT id
        FROM reconciliation_jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `);

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const jobId = row.id as string;

    const claimed = await tx.execute(sql`
        UPDATE reconciliation_jobs
        SET
            status = 'processing',
            started_at = NOW(),
            attempt_count = attempt_count + 1
        WHERE id = ${jobId}
        RETURNING
            id,
            attempt_count AS "attemptCount"
      `);

    return claimed.rows[0] ?? null;
  });
}

export async function findTransactionsForJob(jobId: string) {
  return db
    .select({
      transaction: transactions,
    })
    .from(reconciliationJobTransactions)
    .innerJoin(
      transactions,
      eq(reconciliationJobTransactions.transactionId, transactions.id),
    )
    .where(eq(reconciliationJobTransactions.reconciliationJobId, jobId));
}

export async function runReconciliationWorkerOnce() {
  const job = await claimNextReconciliationJob();

  if (!job) {
    return null;
  }

  const jobId = job.id as string;
  const attemptCount = Number(job.attemptCount);
  const startedAt = Date.now();

  logger.info(
    {
      event: "reconciliation_job_claimed",
      jobId,
      attemptCount,
    },
    "Reconciliation job claimed",
  );

  try {
    const jobTransactions = await findTransactionsForJob(jobId);

    const result = await processReconciliationJob(jobId, jobTransactions);

    logger.info(
      {
        event: "reconciliation_job_completed",
        jobId,
        attemptCount,
        outcome: result.outcome,
        durationMs: Date.now() - startedAt,
      },
      "Reconciliation job completed",
    );

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt
    await handleReconciliationJobFailure(jobId, attemptCount, error, durationMs);
    throw error;
  }
}

export async function handleReconciliationJobFailure(
  jobId: string,
  attemptCount: number,
  error: unknown,
  durationMs: number
) {
  const message =
    error instanceof Error ? error.message : "Unknown reconciliation failure";

  if (attemptCount < MAX_ATTEMPTS) {
    await db
      .update(reconciliationJobs)
      .set({
        status: "pending",
        failureCode: null,
        failureMessage: null,
        failedAt: null,
        startedAt: null,
      })
      .where(eq(reconciliationJobs.id, jobId));

    logger.warn(
      {
        event: "reconciliation_job_requeued",
        jobId,
        attemptCount,
        maxAttempts: MAX_ATTEMPTS,
        error: message,
        durationMs
      },
      "Reconciliation job failed and was requeued",
    );

    return;
  }

  await db
    .update(reconciliationJobs)
    .set({
      status: "failed",
      failureCode: "PROCESSING_ERROR",
      failureMessage: message,
      failedAt: new Date(),
    })
    .where(eq(reconciliationJobs.id, jobId));

  logger.error(
    {
      event: "reconciliation_job_failed",
      jobId,
      attemptCount,
      failureCode: "PROCESSING_ERROR",
      error: message,
    },
    "Reconciliation job permanently failed",
  );
}
