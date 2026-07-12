import type { Metadata } from "next";
import { getSession } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { ActiveProjectProvider } from "@/context/active-project";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.user.companyId == null) {
    redirect("/onboarding");
  }

  return (
    <ActiveProjectProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <SidebarNav
          userName={session.user.name ?? "User"}
          userEmail={session.user.email ?? ""}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ActiveProjectProvider>
  );
}
