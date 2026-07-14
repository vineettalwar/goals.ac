"use client";

import Link from "next/link";
import { Calendar, Check, Loader2, Send } from "lucide-react";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X / Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "bluesky", label: "Bluesky" },
  { id: "mastodon", label: "Mastodon" },
] as const;

type QueueItem = {
  id: number;
  title: string;
  formatType: string;
  platform: string | null;
  approvalStatus: string;
  status: string;
  scheduledAt: string | null;
  bodyMarkdown: string;
};

export function SocialHubQueueTab({
  projectId,
  platformFilter,
  onPlatformFilterChange,
  loadingQueue,
  queue,
  onRefresh,
  onSubmitReview,
  onApprove,
  onSchedule,
}: {
  projectId: string;
  platformFilter: string;
  onPlatformFilterChange: (v: string) => void;
  loadingQueue: boolean;
  queue: QueueItem[];
  onRefresh: () => void;
  onSubmitReview: (id: number) => void;
  onApprove: (id: number) => void;
  onSchedule: (id: number, iso: string) => void;
}) {
  return (
        <TabsContent value="queue" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={platformFilter} onValueChange={onPlatformFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void onRefresh()}>
              Refresh
            </Button>
          </div>

          {loadingQueue ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading queue…
            </div>
          ) : queue.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No social posts in the queue yet. Create LinkedIn/X/IG posts in Content Studio, then
                schedule them here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          <Link
                            href={contentPiecePath(projectId, item.id)}
                            className="hover:underline"
                          >
                            {item.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary">{item.formatType.replace(/_/g, " ")}</Badge>
                          {item.platform && <Badge variant="outline">{item.platform}</Badge>}
                          <Badge
                            variant={
                              item.approvalStatus === "approved"
                                ? "default"
                                : item.approvalStatus === "pending_review"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {item.approvalStatus.replace(/_/g, " ")}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        {item.approvalStatus === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => void onSubmitReview(item.id)}>
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Submit
                          </Button>
                        )}
                        {item.approvalStatus === "pending_review" && (
                          <>
                            <Button size="sm" onClick={() => void onApprove(item.id)}>
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.bodyMarkdown}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="datetime-local"
                        className="w-auto max-w-[220px]"
                        defaultValue={
                          item.scheduledAt
                            ? item.scheduledAt.slice(0, 16)
                            : ""
                        }
                        onBlur={(e) => {
                          if (e.target.value) void onSchedule(item.id, e.target.value);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
  );
}
