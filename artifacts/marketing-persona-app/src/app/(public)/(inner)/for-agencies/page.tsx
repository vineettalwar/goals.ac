import type { Metadata } from "next";
import Link from "next/link";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "For Agencies | goals.ac",
  description: "Multi-client SEO and GEO consulting for agencies: partner workspace, BYOK billing, and per-client content programs.",
};

export default function Page() {
  return (
    <FeatureLanderDynamic
      configKey="forAgencies"
      middleContent={
        <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto -mt-4 mb-8">
          Already onboarded?{" "}
          <Link href="/partner" className="text-(--accent-warm) hover:underline font-medium">
            Open partner workspace
          </Link>{" "}
          (site admin sign-in required).
        </p>
      }
    />
  );
}
