import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { SidebarNav } from "@/components/sidebar-nav";

const ONBOARDING_EXEMPT = ["/onboarding", "/settings", "/api"];

export default async function AppLayout({ children, params }: { children: React.ReactNode; params?: unknown }) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = parseInt(session.user.id, 10);

  // Check if user has completed onboarding
  const [company] = await db
    .select({ id: companiesTable.id, onboardingComplete: companiesTable.onboardingComplete })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  // Redirect to onboarding if no company record yet (and not already on exempt path)
  // Note: path checking in RSC requires headers
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") ?? headersList.get("next-url") ?? "";
  const isExempt = ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p));

  if (!company && !isExempt) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav
        userName={session.user.name ?? "User"}
        userEmail={session.user.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

