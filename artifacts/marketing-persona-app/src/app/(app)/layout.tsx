import type { Metadata } from "next";
import { getSession } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { ActiveProjectProvider } from "@/context/active-project";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { MfaComplianceGate } from "@/components/mfa/mfa-compliance-gate";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.user.companyId == null && !session.impersonation && !session.supportOrganization) {
    redirect("/onboarding");
  }

  const sidebarRole = session.impersonatorRole ?? session.user.role;

  return (
    <ActiveProjectProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <SidebarNav
          userName={session.user.name ?? "User"}
          userEmail={session.user.email ?? ""}
          userRole={sidebarRole}
          orgRole={session.user.orgRole}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ImpersonationBanner />
          <MfaComplianceGate>
            <main className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">{children}</main>
          </MfaComplianceGate>
        </div>
      </div>
    </ActiveProjectProvider>
  );
}
