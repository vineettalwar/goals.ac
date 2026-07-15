export type GrowthRoadmap = {
  id?: number;
  slug: string;
  industry: string;
  location: string;
  stage: string;
  content?: unknown;
  viewCount?: number;
  createdAt?: number | string;
  updatedAt?: number | string;
  [key: string]: unknown;
};

import type { ReactNode } from "react";

export type GrowthRoadmapLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function growthRoadmapsListPath(): string {
  return "/strategy/roadmaps";
}
