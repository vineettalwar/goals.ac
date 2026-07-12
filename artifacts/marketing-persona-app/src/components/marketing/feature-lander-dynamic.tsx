import dynamic from "next/dynamic";
import { MarketingPageSkeleton } from "@/components/marketing-page-skeleton";
import type { LanderConfigKey } from "./feature-lander-page";

const FeatureLanderByKey = dynamic(
  () => import("./feature-lander-page").then((m) => m.FeatureLanderByKey),
  { loading: () => <MarketingPageSkeleton /> },
);

export function FeatureLanderDynamic({ configKey }: { configKey: LanderConfigKey }) {
  return <FeatureLanderByKey configKey={configKey} />;
}
