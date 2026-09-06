"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import type { LanderConfigKey } from "./feature-lander-page";

const FeatureLanderByKey = dynamic(
  () => import("./feature-lander-page").then((m) => m.FeatureLanderByKey),
);

/** Code-split lander body without a soft-nav skeleton blank. */
export function FeatureLanderDynamic({
  configKey,
  middleContent,
}: {
  configKey: LanderConfigKey;
  middleContent?: ReactNode;
}) {
  return <FeatureLanderByKey configKey={configKey} middleContent={middleContent} />;
}
