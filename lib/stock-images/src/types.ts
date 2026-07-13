export type StockProvider = "unsplash" | "pexels";

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
};

export type RankedStockPhoto = StockPhoto & { rankScore: number };
