import { eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/client.js";
import {
  reconciliationJobs,
  reconciliationResults,
  reconciliationResultTransactions,
  transactions,
} from "../../infrastructure/database/schema.js";
import { findCounterpartCandidate } from "../../infrastructure/database/repositories/transaction-repository.js";

type Transaction = typeof transactions.$inferSelect;

export async function processReconciliationJob(
  jobId: string,
  jobTransactions: Array<{
    transaction: Transaction;
  }>,
) {
  const primary = jobTransactions[0]?.transaction;

  if (!primary) {
    throw new Error("Reconciliation job has no transactions");
  }

  const counterpart = await findCounterpartCandidate(primary);

  if (!counterpart) {
    return db.transaction(async (tx) => {
      const [result] = await tx
        .insert(reconciliationResults)
        .values({
          reconciliationJobId: jobId,
          outcome: "pending",
          ruleCode: "NO_COUNTERPART_FOUND",
          reason: "No matching counterpart transaction was found.",
        })
        .returning();

      if (!result) {
        throw new Error("Failed to create reconciliation result");
      }

      await tx.insert(reconciliationResultTransactions).values({
        reconciliationResultId: result.id,
        transactionId: primary.id,
        role: "source",
      });

      await tx
        .update(reconciliationJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          failureCode: null,
          failureMessage: null,
          failedAt: null,
        })
        .where(eq(reconciliationJobs.id, jobId));

      return result;
    });
  }

  throw new Error("Counterpart matching outcome is not implemented yet");
}
