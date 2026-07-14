import { AdminSectionLayout } from "@/components/admin/layout/admin-section-layout";

export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSectionLayout
      title="Users"
      description="Cross-tenant directory, impersonation, and invitations."
      wide
    >
      {children}
    </AdminSectionLayout>
  );
}
