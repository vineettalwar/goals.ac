import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert } from "lucide-react";

import { AdminSectionLayout } from "@/components/admin/layout/admin-section-layout";
import { PublishReliabilityAlertButton } from "@/components/admin/publish-reliability/publish-reliability-alert-button";
import { getPublishReliabilityWindow } from "@/lib/admin/publish-reliability";
import { getPlatformSettings } from "@/lib/platform/platform-settings";

function formatDateTime(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PublishReliabilityPage() {
  const [window, platformSettings] = await Promise.all([
    getPublishReliabilityWindow({ windowHours: 24, failedRecordsLimit: 50, includeBackgroundJobFailures: true }),
    getPlatformSettings(),
  ]);

  const { failedPublishRecordsCount, failedPublishRecords, backgroundJobFailures24h } = window;

  const pilotFilterLabel = window.pilotOrganizationIdsConfigured
    ? `Pilot orgs: ${window.pilotOrganizationIds.join(", ")}`
    : "Pilot org filter not set (showing all orgs)";

  return (
    <AdminSectionLayout
      title="Publish reliability"
      description="Failed publish_records and (when available) background job failures for operational visibility."
      actions={
        <PublishReliabilityAlertButton
          disabled={!platformSettings.emailEnabled}
          failedPublishRecordsCount24h={failedPublishRecordsCount}
        />
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={failedPublishRecordsCount > 0 ? "border-destructive/30 bg-destructive/5" : undefined}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Failed publish_records (last 24h)
            </CardTitle>
            <CardDescription>{pilotFilterLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{failedPublishRecordsCount}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {failedPublishRecordsCount > 0 ? (
                <Badge variant="destructive">Attention needed</Badge>
              ) : (
                <Badge variant="secondary">No failures</Badge>
              )}
              <span className="text-xs text-muted-foreground">Tracked across all CMS providers.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Background job failures (last 24h)</CardTitle>
            <CardDescription>Optional visibility (pg-boss job table when present).</CardDescription>
          </CardHeader>
          <CardContent>
            {backgroundJobFailures24h ? (
              <div>
                <p className="text-3xl font-semibold tabular-nums">{backgroundJobFailures24h.total}</p>
                <div className="mt-3 space-y-2">
                  {backgroundJobFailures24h.byQueue.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No failed jobs found.</p>
                  ) : (
                    backgroundJobFailures24h.byQueue.map((row) => (
                      <div key={row.queue} className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{row.queue}</span>
                        <span className="text-sm text-muted-foreground tabular-nums">{row.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Background job failure counts not available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Failed publish_records details</CardTitle>
            <CardDescription>
              Showing up to 50 most-recent rows created in the last 24 hours. Error messages come from the publish attempt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {failedPublishRecords.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No failed publish_records in the last 24 hours.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-40">Time</TableHead>
                    <TableHead className="w-50">Project</TableHead>
                    <TableHead className="w-35">Provider</TableHead>
                    <TableHead className="w-55">Piece</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedPublishRecords.map((row) => (
                    <TableRow key={row.publishRecordId}>
                      <TableCell className="tabular-nums">{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{row.websiteProjectName}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.organizationName ?? "Unknown org"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium line-clamp-2">{row.pieceTitle ?? "Untitled"}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{row.contentPieceId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-130">
                        <p className="text-sm text-destructive/90 line-clamp-2">
                          {row.errorMessage ?? "Unknown error"}
                        </p>
                        {row.outputMode ? (
                          <p className="mt-1 text-xs text-muted-foreground">outputMode: {row.outputMode}</p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminSectionLayout>
  );
}

