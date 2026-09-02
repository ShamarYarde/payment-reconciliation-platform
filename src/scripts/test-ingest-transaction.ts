import { ingestTransaction } from "../application/services/ingest-transaction.js";
import { pool } from "../infrastructure/database/client.js";

async function main() {
  const transaction = await ingestTransaction({
    sourceId: "89ab2b8b-3b54-486a-a304-e8ad86ce944d",
    externalTransactionId: "PAY-ROLLBACK-JOB-1001",
    reference: "ORDER-SERVICE-1001",
    amountMinor: 12500,
    currency: "USD",
    transactionType: "payment",
    status: "captured",
    occurredAt: new Date(),
    rawSourceData: {
      id: "PAY-SERVICE-1001",
      reference: "ORDER-SERVICE-1001",
      amount: "125.00",
      currency: "USD",
    },
  });

  console.log("Ingested transaction:", transaction);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
