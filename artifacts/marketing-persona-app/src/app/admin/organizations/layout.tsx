import { AdminSectionLayout } from "@/components/admin/admin-section-layout";

export default function AdminOrganizationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSectionLayout
      title="Organizations"
      description="Manage tenants and onboard new customers."
    >
      {children}
    </AdminSectionLayout>
  );
}
