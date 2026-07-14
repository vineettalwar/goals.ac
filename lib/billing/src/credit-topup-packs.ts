export interface CreditTopUpPack {
  id: string;
  label: string;
  credits: number;
  stripePriceId: string;
}

export function listCreditTopUpPacks(): CreditTopUpPack[] {
  const packs: Array<{ id: string; label: string; credits: number; envKey: string }> = [
    { id: "pack_500", label: "500 credits", credits: 500, envKey: "STRIPE_CREDIT_TOPUP_500_PRICE_ID" },
    { id: "pack_2000", label: "2,000 credits", credits: 2000, envKey: "STRIPE_CREDIT_TOPUP_2000_PRICE_ID" },
  ];

  return packs
    .map((pack) => {
      const stripePriceId = process.env[pack.envKey]?.trim();
      if (!stripePriceId) return null;
      return { id: pack.id, label: pack.label, credits: pack.credits, stripePriceId };
    })
    .filter((pack): pack is CreditTopUpPack => pack != null);
}
