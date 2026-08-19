import { DailyFiveClient } from "@/components/content-studio/daily-five-client";

export default async function DailyFivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DailyFiveClient projectId={id} />;
}
