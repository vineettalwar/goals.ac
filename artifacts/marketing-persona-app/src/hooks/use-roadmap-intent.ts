"use client";

import { useEffect, useState } from "react";
import { readRoadmapIntent, type RoadmapIntent } from "@/lib/roadmap-intent";

/** Reads sessionStorage roadmap intent after mount to avoid SSR hydration mismatches. */
export function useRoadmapIntent(): RoadmapIntent | null {
  const [intent, setIntent] = useState<RoadmapIntent | null>(null);

  useEffect(() => {
    setIntent(readRoadmapIntent());
  }, []);

  return intent;
}
