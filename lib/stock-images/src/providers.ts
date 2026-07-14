export const FREE_STOCK_PROVIDERS = ["unsplash", "pexels"] as const;
/** Paid stock providers are out of scope per product decision (copyright-free only). */
export const PAID_STOCK_PROVIDERS = [] as const;
export const STOCK_PROVIDER_IDS = [...FREE_STOCK_PROVIDERS] as const;

export type FreeStockProvider = (typeof FREE_STOCK_PROVIDERS)[number];
export type PaidStockProvider = never;
export type StockProviderId = (typeof STOCK_PROVIDER_IDS)[number];

/** Providers with live search in Content Studio. */
export type SearchableStockProvider = StockProviderId;

export type StockProviderBilling = "free" | "paid";

export type StockProviderMeta = {
  id: StockProviderId;
  label: string;
  billing: StockProviderBilling;
  searchImplemented: boolean;
  /** Org/project may store an encrypted API key for this provider. */
  byokAllowed: boolean;
  docsUrl: string;
};

export const STOCK_PROVIDER_REGISTRY: Record<StockProviderId, StockProviderMeta> = {
  unsplash: {
    id: "unsplash",
    label: "Unsplash",
    billing: "free",
    searchImplemented: true,
    byokAllowed: true,
    docsUrl: "https://unsplash.com/developers",
  },
  pexels: {
    id: "pexels",
    label: "Pexels",
    billing: "free",
    searchImplemented: true,
    byokAllowed: true,
    docsUrl: "https://www.pexels.com/api/",
  },
};

/** Copyright-free providers used for search and generation. */
export const SEARCHABLE_STOCK_PROVIDERS = [...FREE_STOCK_PROVIDERS] as SearchableStockProvider[];

export function isStockProviderId(value: string): value is StockProviderId {
  return (STOCK_PROVIDER_IDS as readonly string[]).includes(value);
}

export function isPaidStockProvider(_provider: StockProviderId): _provider is PaidStockProvider {
  return false;
}

export function listByokStockProviders(): StockProviderMeta[] {
  return STOCK_PROVIDER_IDS.map((id) => STOCK_PROVIDER_REGISTRY[id]).filter((p) => p.byokAllowed);
}

export function listPaidByokProviders(): StockProviderMeta[] {
  return [];
}
