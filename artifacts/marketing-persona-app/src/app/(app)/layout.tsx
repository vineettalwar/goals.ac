import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

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
