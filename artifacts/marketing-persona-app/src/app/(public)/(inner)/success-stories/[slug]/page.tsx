import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudyDetailClient } from "@/components/marketing/case-study-detail-client";
import { getCaseStudyBySlug, MARKETING_CASE_STUDIES } from "@/lib/marketing/case-studies";

export function generateStaticParams() {
  return MARKETING_CASE_STUDIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) return { title: "Not found" };
  return {
    title: `${study.company} — ${study.metric} ${study.value} | goals.ac`,
    description: study.summary,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) notFound();
  return <CaseStudyDetailClient study={study} />;
}
