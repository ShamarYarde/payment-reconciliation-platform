import Fastify from "fastify";
import { transactionRoutes } from "./api/routes/transactions.js";
import { reconciliationResultRoutes } from "./api/routes/reconciliation-results.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  app.register(transactionRoutes);
  app.register(reconciliationResultRoutes);

  return app;
}
