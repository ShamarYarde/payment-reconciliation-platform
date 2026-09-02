import { and, eq, ne } from "drizzle-orm";

import { db } from "../client.js";
import { transactions } from "../schema.js";

type CounterpartSearchInput = Pick<
  typeof transactions.$inferSelect,
  "id" | "reference" | "currency" | "amountMinor" | "transactionType"
>;

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

export async function findCounterpartCandidate(
  transaction: CounterpartSearchInput,
) {
  if (!transaction.reference) {
    return null;
  }

  const counterpartType =
    transaction.transactionType === "payment"
      ? "settlement"
      : transaction.transactionType === "settlement"
        ? "payment"
        : null;

  if (!counterpartType) {
    return null
  }

  const [candidate] = await db
    .select()
    .from(transactions)
    .where(
      and(
        ne(transactions.id, transaction.id),
        eq(transactions.reference, transaction.reference),
        eq(transactions.currency, transaction.currency),
        eq(transactions.amountMinor, transaction.amountMinor),
        eq(transactions.transactionType, counterpartType)
      ),
    )
    .limit(1);

  return candidate ?? null;
}
