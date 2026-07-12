import dynamic from "next/dynamic";
import { MarketingPageSkeleton } from "@/components/marketing-page-skeleton";

function marketingSkeleton() {
  return <MarketingPageSkeleton />;
}

export const LearnPageDynamic = dynamic(
  () => import("./learn-page-client").then((m) => m.LearnPageClient),
  { loading: marketingSkeleton },
);

export const HelpPageDynamic = dynamic(
  () => import("./help-page-client").then((m) => m.HelpPageClient),
  { loading: marketingSkeleton },
);

export const HelpArticleDynamic = dynamic(
  () => import("./help-article-client").then((m) => m.HelpArticleClient),
  { loading: marketingSkeleton },
);

export const FreeToolsPageDynamic = dynamic(
  () => import("./free-tools-page-client").then((m) => m.FreeToolsPageClient),
  { loading: marketingSkeleton },
);

export const ComparePageDynamic = dynamic(
  () => import("./compare-page-client").then((m) => m.ComparePageClient),
  { loading: marketingSkeleton },
);

export const FeaturesPageDynamic = dynamic(
  () => import("./features-page-client").then((m) => m.FeaturesPageClient),
  { loading: marketingSkeleton },
);

export const PricingPageDynamic = dynamic(
  () => import("./pricing-page-client").then((m) => m.PricingPageClient),
  { loading: marketingSkeleton },
);

export const GeoAuditPageDynamic = dynamic(
  () => import("./geo-audit-page-client").then((m) => m.GeoAuditPageClient),
  { loading: marketingSkeleton },
);

export const AboutPageDynamic = dynamic(
  () => import("./about-page-client").then((m) => m.AboutPageClient),
  { loading: marketingSkeleton },
);

export const ProductRoadmapPageDynamic = dynamic(
  () => import("./product-roadmap-page-client").then((m) => m.ProductRoadmapPageClient),
  { loading: marketingSkeleton },
);

export const SolutionsPageDynamic = dynamic(
  () => import("./solutions-page-client").then((m) => m.SolutionsPageClient),
  { loading: marketingSkeleton },
);

export const ContactPageDynamic = dynamic(
  () => import("./contact-page-client").then((m) => m.ContactPageClient),
  { loading: marketingSkeleton },
);
