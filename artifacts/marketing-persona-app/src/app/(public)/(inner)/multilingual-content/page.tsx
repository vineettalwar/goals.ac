import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Multilingual Content | goals.ac",
  description:
    "Multilingual SEO drafts in major locales (beta). Localized keyword research is waitlist — we do not claim native-quality at scale yet.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="multilingual" />;
}
