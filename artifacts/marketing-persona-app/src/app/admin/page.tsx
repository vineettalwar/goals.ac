import { AdminSectionLayout } from "@/components/admin/admin-section-layout";
import { AdminOverviewPanel } from "@/components/admin/admin-overview-panel";
import { getAdminOverview } from "@/lib/org/admin-overview";

export default async function AdminPage() {
  const overview = await getAdminOverview();

  return (
    <AdminSectionLayout
      title="Overview"
      description="Recent activity and anything that needs your attention."
    >
      <AdminOverviewPanel data={overview} />
    </AdminSectionLayout>
  );
}
