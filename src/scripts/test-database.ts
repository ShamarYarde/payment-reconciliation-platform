import { createTransactionSource } from "../infrastructure/database/repositories/transaction-source-repository.js";
import { createImportBatch } from "../infrastructure/database/repositories/import-batch-repository.js";
import { createTransaction } from "../infrastructure/database/repositories/transaction-repository.js";
import { pool } from "../infrastructure/database/client.js";

async function main() {
  const source = await createTransactionSource({
    name: "Repository Test Payment Source",
    sourceType: "payment",
    status: "active",
  });

  console.log("Created source:", source);

  const batch = await createImportBatch({
    sourceId: source.id,
    status: "received",
    totalRecords: 1,
    validRecords: 1,
    invalidRecords: 0,
  });

  console.log("Created batch:", batch);

  const transaction = await createTransaction({
    importBatchId: batch.id,
    sourceId: source.id,
    externalTransactionId: "PAY-REPOSITORY-1001",
    reference: "ORDER-REPOSITORY-1001",
    amountMinor: 12500,
    currency: "USD",
    transactionType: "payment",
    status: "captured",
    occurredAt: new Date(),
  });

  console.log("Created transaction:", transaction);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
