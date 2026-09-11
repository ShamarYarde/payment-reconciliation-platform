import type { FastifyInstance } from "fastify";
import { getReconciliationResultById } from "../../infrastructure/database/repositories/reconciliation-result-repository.js";

export async function reconciliationResultRoutes(app: FastifyInstance) {
  app.get<{
    Params: {
      id: string;
    };
  }>("/api/v1/reconciliation-results/:id", async (request, reply) => {
    const { id } = request.params;

    const result = await getReconciliationResultById(id);

    if (!result) {
      return reply.status(404).send({
        error: "Reconciliation result not found",
      });
    }

    return reply.status(200).send(result);
  });
}
