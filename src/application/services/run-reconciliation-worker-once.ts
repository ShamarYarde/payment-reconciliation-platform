import { sql, eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/client.js";
import {
  reconciliationJobs,
  reconciliationJobTransactions,
  transactions,
} from "../../infrastructure/database/schema.js";
import { processReconciliationJob } from "./process-reconciliation-job.js";

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
        RETURNING *
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

  try {
    const jobTransactions = await findTransactionsForJob(jobId);

    const result = await processReconciliationJob(jobId, jobTransactions);

    return result;
  } catch (error) {
    await markReconciliationJobFailed(jobId, error)
    throw error;
  }
}

export async function markReconciliationJobFailed(
  jobId: string,
  error: unknown,
) {
  const message =
    error instanceof Error ? error.message : "Unknown reconciliation failure";

  await db
    .update(reconciliationJobs)
    .set({
      status: "failed",
      failureCode: "PROCESSING_ERROR",
      failureMessage: message,
      failedAt: new Date(),
    })
    .where(eq(reconciliationJobs.id, jobId));
}
