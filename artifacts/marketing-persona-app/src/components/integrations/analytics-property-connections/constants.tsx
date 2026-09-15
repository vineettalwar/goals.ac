import { BarChart3 } from "lucide-react";

export const PROVIDER_META = {
  google_analytics_4: {
    label: "Google Analytics 4",
    shortLabel: "GA4",
    description: "Sessions, pageviews, and engagement for published content.",
    icon: <BarChart3 className="h-4 w-4 text-orange-600" />,
  },
} as const;

export const ANALYTICS_INTEGRATIONS_COUNT = 1;

export function ga4ConsoleUrl(propertyId: string | null): string {
  if (!propertyId) return "https://analytics.google.com/";
  const numericId = propertyId.replace(/^properties\//, "");
  return `https://analytics.google.com/analytics/web/#/p${numericId}/reports/intelligenthome`;
}
