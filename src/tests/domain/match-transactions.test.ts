import { describe, expect, it } from "vitest";
import { isExactPaymentSettlementMatch } from "../../domain/reconciliation/match-transaction.js";

const payment = {
  reference: "ORDER-1001",
  amountMinor: 12500,
  currency: "USD",
  transactionType: "payment" as const,
  status: "captured",
};

const settlement = {
  reference: "ORDER-1001",
  amountMinor: 12500,
  currency: "USD",
  transactionType: "settlement" as const,
  status: "settled",
};

describe("isExactPaymentSettlementMatch", () => {
  it("matches a compatible payment and settlement", () => {
    expect(isExactPaymentSettlementMatch(payment, settlement)).toBe(true);
  });

  it("does not match different references", () => {
    expect(
      isExactPaymentSettlementMatch(payment, {
        ...settlement,
        reference: "ORDER-9999",
      }),
    ).toBe(false);
  });

  it("does not match different currencies", () => {
    expect(
      isExactPaymentSettlementMatch(payment, {
        ...settlement,
        currency: "BBD",
      }),
    ).toBe(false);
  });

  it("does not match incompatible statuses", () => {
    expect(
      isExactPaymentSettlementMatch(payment, {
        ...settlement,
        status: "pending",
      }),
    ).toBe(false);
  });
});
