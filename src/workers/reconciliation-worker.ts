import { pool } from "../infrastructure/database/client.js";
import { runReconciliationWorkerOnce } from "../application/services/run-reconciliation-worker-once.js";

async function main() {
  const result = await runReconciliationWorkerOnce();

  if (!result) {
    console.log("No pending reconciliation jobs.");
    return;
  }

  console.log("Processed reconciliation job:", result);
}

main()
  .catch((error) => {
    console.error("Reconciliation worker failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
