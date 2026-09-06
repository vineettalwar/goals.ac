import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntegrationLanderPageClient } from "@/components/marketing/pages/product/integration-lander-page-client";
import {
  getIntegrationLander,
  integrationLanderPath,
  listIntegrationLanders,
} from "@/lib/marketing/content/integration-landers";
import { getSiteUrl } from "@/lib/marketing/site/site-url";

export function generateStaticParams() {
  return listIntegrationLanders().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lander = getIntegrationLander(slug);
  if (!lander) return { title: "Integrations" };
  const url = `${getSiteUrl()}${integrationLanderPath(lander.slug)}`;
  return {
    title: lander.metaTitle,
    description: lander.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: `${lander.metaTitle} | goals.ac`,
      description: lander.metaDescription,
      url,
      type: "website",
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lander = getIntegrationLander(slug);
  if (!lander) notFound();

  const site = getSiteUrl();
  const pageUrl = `${site}${integrationLanderPath(lander.slug)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: `goals.ac → ${lander.label}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: pageUrl,
        description: lander.metaDescription,
        offers: {
          "@type": "Offer",
          url: `${site}/pricing`,
          priceCurrency: "USD",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: lander.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site },
          {
            "@type": "ListItem",
            position: 2,
            name: "Integrations",
            item: `${site}/integrations`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: lander.label,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <IntegrationLanderPageClient lander={lander} />
    </>
  );
}
