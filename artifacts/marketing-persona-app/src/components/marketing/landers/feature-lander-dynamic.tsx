"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { MarketingPageSkeleton } from "@/components/skeletons/marketing-page-skeleton";
import type { LanderConfigKey } from "./feature-lander-page";

const FeatureLanderByKey = dynamic(
  () => import("./feature-lander-page").then((m) => m.FeatureLanderByKey),
  { loading: () => <MarketingPageSkeleton /> },
);

export function FeatureLanderDynamic({
  configKey,
  middleContent,
}: {
  configKey: LanderConfigKey;
  middleContent?: ReactNode;
}) {
  return <FeatureLanderByKey configKey={configKey} middleContent={middleContent} />;
}
