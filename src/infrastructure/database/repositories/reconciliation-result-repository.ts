import { eq } from "drizzle-orm";

import { db } from "../client.js";
import {
  reconciliationResults,
  reconciliationResultTransactions,
  transactions,
} from "../schema.js";

export type CreateReconciliationResult =
  typeof reconciliationResults.$inferInsert;

export async function createReconciliationResult(
  result: CreateReconciliationResult,
) {
  const [reconciliationResult] = await db
    .insert(reconciliationResults)
    .values(result)
    .returning();

  if (!reconciliationResult) {
    throw new Error("Failed to create reconciliation result");
  }

  return reconciliationResult;
}

export async function getReconciliationResultById(id: string) {
  const [result] = await db
    .select()
    .from(reconciliationResults)
    .where(eq(reconciliationResults.id, id))
    .limit(1);

  if (!result) {
    return null;
  }

  const relatedTransactions = await db
    .select({
      id: transactions.id,
      externalTransactionId: transactions.externalTransactionId,
      reference: transactions.reference,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      transactionType: transactions.transactionType,
      status: transactions.status,
      role: reconciliationResultTransactions.role,
    })
    .from(reconciliationResultTransactions)
    .innerJoin(
      transactions,
      eq(reconciliationResultTransactions.transactionId, transactions.id),
    )
    .where(
      eq(reconciliationResultTransactions.reconciliationResultId, result.id),
    );

  return {
    ...result,
    transactions: relatedTransactions,
  };
}
