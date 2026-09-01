import type { FastifyInstance } from "fastify";
import { ingestTransaction } from "../../application/services/ingest-transaction.js";

interface CreateTransactionBody {
  sourceId: string;
  externalTransactionId: string;
  reference?: string;
  amountMinor: number;
  currency: string;
  transactionType: "payment" | "settlement" | "refund";
  status: string;
  occurredAt: string;
  rawSourceData?: Record<string, unknown>;
}

export async function transactionRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateTransactionBody }>(
    "/api/v1/transactions",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "sourceId",
            "externalTransactionId",
            "amountMinor",
            "currency",
            "transactionType",
            "status",
            "occurredAt",
          ],
          properties: {
            sourceId: {
              type: "string",
              format: "uuid",
            },
            externalTransactionId: {
              type: "string",
              minLength: 1,
            },
            reference: {
              type: "string",
            },
            amountMinor: {
              type: "integer",
            },
            currency: {
              type: "string",
              minLength: 3,
              maxLength: 3,
            },
            transactionType: {
              type: "string",
              enum: ["payment", "settlement", "refund"],
            },
            status: {
              type: "string",
              minLength: 1,
            },
            occurredAt: {
              type: "string",
              format: "date-time",
            },
            rawSourceData: {
              type: "object",
              additionalProperties: true,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const transaction = await ingestTransaction({
        ...request.body,
        occurredAt: new Date(request.body.occurredAt),
      });

      return reply.code(201).send(transaction);
    },
  );
}
