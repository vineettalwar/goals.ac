import { describe, expect, it } from "vitest";
import { listCreditTopUpPacks } from "./credit-topup-packs";

describe("listCreditTopUpPacks", () => {
  it("returns empty when Stripe top-up price env vars are unset", () => {
    const original500 = process.env.STRIPE_CREDIT_TOPUP_500_PRICE_ID;
    const original2000 = process.env.STRIPE_CREDIT_TOPUP_2000_PRICE_ID;
    delete process.env.STRIPE_CREDIT_TOPUP_500_PRICE_ID;
    delete process.env.STRIPE_CREDIT_TOPUP_2000_PRICE_ID;

    expect(listCreditTopUpPacks()).toEqual([]);

    if (original500) process.env.STRIPE_CREDIT_TOPUP_500_PRICE_ID = original500;
    if (original2000) process.env.STRIPE_CREDIT_TOPUP_2000_PRICE_ID = original2000;
  });

  it("includes packs when price env vars are configured", () => {
    process.env.STRIPE_CREDIT_TOPUP_500_PRICE_ID = "price_test_500";
    const packs = listCreditTopUpPacks();
    expect(packs.some((pack) => pack.id === "pack_500" && pack.credits === 500)).toBe(true);
    delete process.env.STRIPE_CREDIT_TOPUP_500_PRICE_ID;
  });
});
