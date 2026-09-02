export async function processReconciliationJob(
  jobId: string,
  jobTransactions: Array<{
    transaction: {
      id: string;
      reference: string | null;
      amountMinor: number;
      currency: string;
      status: string;
      transactionType: "payment" | "settlement" | "refund";
    };
  }>,
) {
  console.log("Processing reconciliation job:", jobId);
  console.log("Transactions:", jobTransactions);

  return {
    jobId,
    transactionCount: jobTransactions.length,
  };
}
