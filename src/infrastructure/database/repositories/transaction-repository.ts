import { and, eq } from "drizzle-orm";

import { db } from "../client.js";
import { transactions } from "../schema.js";

export type CreateTransactionInput = typeof transactions.$inferInsert;

export async function createTransaction(input: CreateTransactionInput) {
  const [transaction] = await db.insert(transactions).values(input).returning();

  if (!transaction) {
    throw new Error("Failed to create transaction");
  }

  return transaction;
}

export async function findTransactionById(id: string) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  return transaction ?? null;
}

export async function findTransactionByExternalId(
  sourceId: string,
  externalTransactionId: string,
) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.sourceId, sourceId),
        eq(transactions.externalTransactionId, externalTransactionId),
      ),
    )
    .limit(1);

  return transaction ?? null;
}
