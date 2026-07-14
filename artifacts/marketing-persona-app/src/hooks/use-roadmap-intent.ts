"use client";

import { useSyncExternalStore } from "react";
import { readRoadmapIntent, type RoadmapIntent } from "@/lib/projects/roadmap-intent";

function subscribeNoop() {
  return () => {};
}

/** Reads sessionStorage roadmap intent after mount to avoid SSR hydration mismatches. */
export function useRoadmapIntent(): RoadmapIntent | null {
  return useSyncExternalStore(
    subscribeNoop,
    () => readRoadmapIntent(),
    () => null,
  );
}
