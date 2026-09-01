import { eq } from "drizzle-orm"

import { db } from "../client.js"
import { importBatches } from "../schema.js"

export type CreateImportBatchInput = typeof importBatches.$inferInsert;

export async function createImportBatch(input: CreateImportBatchInput) {
  const [batch] = await db
    .insert(importBatches)
    .values(input)
    .returning();

  if (!batch) {
    throw new Error("Failed to create import batch");
  }

  return batch;
}

export async function findImportBatchById(id: string) {
  const [batch] = await db
    .select()
    .from(importBatches)
    .where(eq(importBatches.id, id))
    .limit(1);

  return batch ?? null;
}