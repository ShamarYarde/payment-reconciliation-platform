import type { transactions } from "../../infrastructure/database/schema.js";

type MatchableTransaction = Pick<
  typeof transactions.$inferSelect,
  "reference" | "amountMinor" | "currency" | "transactionType" | "status"
>;

export function isExactPaymentSettlementMatch(
  first: MatchableTransaction,
  second: MatchableTransaction,
): boolean {
  const referencesMatch =
    first.reference !== null && first.reference === second.reference;

  const currenciesMatch = first.currency === second.currency;

  const amountsMatch = first.amountMinor === second.amountMinor;

  const typesAreCompatible =
    (first.transactionType === "payment" &&
      second.transactionType === "settlement") ||
    (first.transactionType === "settlement" &&
      second.transactionType === "payment");

  const statusesAreCompatible =
    (first.transactionType === "payment" &&
      first.status === "captured" &&
      second.transactionType === "settlement" &&
      second.status === "settled") ||
    (first.transactionType === "settlement" &&
      first.status === "settled" &&
      second.transactionType === "payment" &&
      second.status === "captured");

  return (
    referencesMatch &&
    currenciesMatch &&
    amountsMatch &&
    typesAreCompatible &&
    statusesAreCompatible
  );
}
