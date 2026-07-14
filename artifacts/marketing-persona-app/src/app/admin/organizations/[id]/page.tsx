import { AdminOrganizationDetailPanel } from "@/components/admin/admin-organization-detail-panel";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organizationId = Number.parseInt(id, 10);

  return <AdminOrganizationDetailPanel organizationId={organizationId} />;
}
