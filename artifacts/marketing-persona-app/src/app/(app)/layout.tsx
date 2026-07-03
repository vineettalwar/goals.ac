import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { SidebarNav } from "@/components/sidebar-nav";

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

  if (!company) {
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

