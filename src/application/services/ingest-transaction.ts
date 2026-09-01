import { findTransactionSourceById } from "../../infrastructure/database/repositories/transaction-source-repository.js";
import { createImportBatch } from "../../infrastructure/database/repositories/import-batch-repository.js";
import {
  createTransaction,
  findTransactionByExternalId,
} from "../../infrastructure/database/repositories/transaction-repository.js";

export interface IngestTransactionInput {
  sourceId: string;
  externalTransactionId: string;
  reference?: string;
  amountMinor: number;
  currency: string;
  transactionType: "payment" | "settlement" | "refund";
  status: string;
  occurredAt: Date;
  rawSourceData?: unknown;
}

export async function ingestTransaction(input: IngestTransactionInput) {
  const source = await findTransactionSourceById(input.sourceId);

  if (!source) {
    throw new Error("Transaction source not found");
  }

  const existingTransaction = await findTransactionByExternalId(
    input.sourceId,
    input.externalTransactionId,
  );

  if (existingTransaction) {
    return existingTransaction;
  }

  const batch = await createImportBatch({
    sourceId: input.sourceId,
    status: "completed",
    totalRecords: 1,
    validRecords: 1,
    invalidRecords: 0,
  });

  const transaction = await createTransaction({
    importBatchId: batch.id,
    sourceId: input.sourceId,
    externalTransactionId: input.externalTransactionId,
    reference: input.reference,
    amountMinor: input.amountMinor,
    currency: input.currency,
    transactionType: input.transactionType,
    status: input.status,
    occurredAt: input.occurredAt,
    rawSourceData: input.rawSourceData
  })

  return transaction;
}
