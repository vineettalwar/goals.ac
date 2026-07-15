import { redirect } from "next/navigation";
import { PersonasPageClient } from "./personas-page-content";

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  if (!companyId) {
    redirect("/onboarding");
  }

  return <PersonasPageClient companyId={companyId} />;
}
