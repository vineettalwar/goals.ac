import dynamic from "next/dynamic";
import { MarketingPageSkeleton } from "@/components/skeletons/marketing-page-skeleton";

function marketingSkeleton() {
  return <MarketingPageSkeleton />;
}

export const LearnPageDynamic = dynamic(
  () => import("../pages/learn/learn-page-client").then((m) => m.LearnPageClient),
  { loading: marketingSkeleton },
);

export const HelpPageDynamic = dynamic(
  () => import("../pages/help/help-page-client").then((m) => m.HelpPageClient),
  { loading: marketingSkeleton },
);

export const HelpArticleDynamic = dynamic(
  () => import("../pages/help/help-article-client").then((m) => m.HelpArticleClient),
  { loading: marketingSkeleton },
);

export const FreeToolsPageDynamic = dynamic(
  () => import("../pages/tools/free-tools-page-client").then((m) => m.FreeToolsPageClient),
  { loading: marketingSkeleton },
);

export const FreeToolPageDynamic = dynamic(
  () => import("../pages/tools/free-tool-page-client").then((m) => m.FreeToolPageClient),
  { loading: marketingSkeleton },
);

export const ComparePageDynamic = dynamic(
  () => import("../pages/product/compare-page-client").then((m) => m.ComparePageClient),
  { loading: marketingSkeleton },
);

export const FeaturesPageDynamic = dynamic(
  () => import("../pages/product/features-page-client").then((m) => m.FeaturesPageClient),
  { loading: marketingSkeleton },
);

export const PricingPageDynamic = dynamic(
  () => import("../pages/company/pricing-page-client").then((m) => m.PricingPageClient),
  { loading: marketingSkeleton },
);

export const GeoAuditPageDynamic = dynamic(
  () => import("../pages/tools/geo-audit-page-client").then((m) => m.GeoAuditPageClient),
  { loading: marketingSkeleton },
);

export const AboutPageDynamic = dynamic(
  () => import("../pages/company/about-page-client").then((m) => m.AboutPageClient),
  { loading: marketingSkeleton },
);

export const ProductRoadmapPageDynamic = dynamic(
  () => import("../pages/product/product-roadmap-page-client").then((m) => m.ProductRoadmapPageClient),
  { loading: marketingSkeleton },
);

export const SolutionsPageDynamic = dynamic(
  () => import("../pages/company/solutions-page-client").then((m) => m.SolutionsPageClient),
  { loading: marketingSkeleton },
);

export const ContactPageDynamic = dynamic(
  () => import("../pages/company/contact-page-client").then((m) => m.ContactPageClient),
  { loading: marketingSkeleton },
);
