import type { Metadata } from "next";
import Link from "next/link";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "For Agencies — goals.ac",
  description: "White-label SEO and GEO workflows for agencies managing multiple client sites.",
};

export default function Page() {
  return (
    <FeatureLanderDynamic
      configKey="forAgencies"
      middleContent={
        <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto -mt-4 mb-8">
          Already onboarded?{" "}
          <Link href="/partner" className="text-primary hover:underline font-medium">
            Open partner workspace
          </Link>{" "}
          (site admin sign-in required).
        </p>
      }
    />
  );
}
