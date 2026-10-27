import { pool } from "../infrastructure/database/client.js";
import { logger } from "../infrastructure/logging/logger.js";
import { runReconciliationWorkerOnce } from "../application/services/run-reconciliation-worker-once.js";

async function main() {
  const result = await runReconciliationWorkerOnce();

  if (!result) {
    logger.info(
      { event: "reconciliation_worker_idle" },
      "No pending reconciliation jobs.",
    );
    return;
  }

  logger.info(
    { event: "reconciliation_job_processed", result },
    "Processed reconciliation job:",
  );
}

main()
  .catch((error) => {
    logger.error(
      {
        event: "reconciliation_worker_failed",
        error,
      },
      "Reconciliation worker failed:",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
