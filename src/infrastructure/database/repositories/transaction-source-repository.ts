import { eq } from "drizzle-orm"
import { db } from "../client.js"
import { transactionSources } from "../schema.js"

export type CreateTransactionSourceInput = typeof transactionSources.$inferInsert;

export async function createTransactionSource(
  input: CreateTransactionSourceInput
) {
  const [source] = await db
    .insert(transactionSources)
    .values(input)
    .returning();

  if (!source) {
    throw new Error("Failed to create transaction source")
  }

  return source;
}

export async function findTransactionSourceById(
  id: string
) {
  const [source] = await db
    .select()
    .from(transactionSources)
    .where(eq(transactionSources.id, id))
    .limit(1);

  return source ?? null;
}