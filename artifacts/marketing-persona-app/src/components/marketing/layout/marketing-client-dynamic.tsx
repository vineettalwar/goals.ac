import dynamic from "next/dynamic";

/**
 * Code-split marketing page clients without a loading UI.
 * A skeleton here (plus segment loading.tsx) blanked the page on every soft-nav.
 */
export const LearnPageDynamic = dynamic(
  () => import("../pages/learn/learn-page-client").then((m) => m.LearnPageClient),
);

export const HelpPageDynamic = dynamic(
  () => import("../pages/help/help-page-client").then((m) => m.HelpPageClient),
);

export const HelpArticleDynamic = dynamic(
  () => import("../pages/help/help-article-client").then((m) => m.HelpArticleClient),
);

export const FreeToolsPageDynamic = dynamic(
  () => import("../pages/tools/free-tools-page-client").then((m) => m.FreeToolsPageClient),
);

export const FreeToolPageDynamic = dynamic(
  () => import("../pages/tools/free-tool-page-client").then((m) => m.FreeToolPageClient),
);

export const ComparePageDynamic = dynamic(
  () => import("../pages/product/compare-page-client").then((m) => m.ComparePageClient),
);

export const FeaturesPageDynamic = dynamic(
  () => import("../pages/product/features-page-client").then((m) => m.FeaturesPageClient),
);

export const PricingPageDynamic = dynamic(
  () => import("../pages/company/pricing-page-client").then((m) => m.PricingPageClient),
);

export const GeoAuditPageDynamic = dynamic(
  () => import("../pages/tools/geo-audit-page-client").then((m) => m.GeoAuditPageClient),
);

export const AboutPageDynamic = dynamic(
  () => import("../pages/company/about-page-client").then((m) => m.AboutPageClient),
);

export const ProductRoadmapPageDynamic = dynamic(
  () => import("../pages/product/product-roadmap-page-client").then((m) => m.ProductRoadmapPageClient),
);

export const SolutionsPageDynamic = dynamic(
  () => import("../pages/company/solutions-page-client").then((m) => m.SolutionsPageClient),
);

export const ContactPageDynamic = dynamic(
  () => import("../pages/company/contact-page-client").then((m) => m.ContactPageClient),
);
