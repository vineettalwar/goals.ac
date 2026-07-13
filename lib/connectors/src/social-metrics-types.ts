export type NormalizedPostMetrics = {
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
};

export const EMPTY_POST_METRICS: NormalizedPostMetrics = {
  impressions: null,
  likes: null,
  comments: null,
  shares: null,
  clicks: null,
};
