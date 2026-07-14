import type { FreeStockProvider } from "./providers";

/** Providers that return photos in search results (copyright-free only). */
export type StockProvider = FreeStockProvider;

export type StockPhotoOrientation = "landscape" | "portrait" | "squarish";

export type StockPhoto = {
  provider: StockProvider;
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  tags?: string[];
  description?: string;
  likes?: number;
};

export type StockSearchOptions = {
  provider?: StockProvider | "auto";
  orientation?: StockPhotoOrientation;
  perPage?: number;
  excludeIds?: string[];
  credentials?: import("./credentials").DecryptedStockCredentialContext;
};

export type RankedStockPhoto = StockPhoto & { rankScore: number };
