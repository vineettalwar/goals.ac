import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, AlertCircle, Send, CheckCircle2 } from "lucide-react";
import {
  type ContentFormatType,
  type PublishDestinationId,
  getConnectedDestinationsForFormat,
  getPublishEndpoint,
  getConnectionSummary,
} from "@/lib/publishing-destinations";
import { API_BASE, type ContentPiece } from "./content-piece-types";

type CmsConnectionStatus = Record<string, unknown>;

async function fetchCmsIntegrations(
  projectId: number,
  token: string,
): Promise<CmsConnectionStatus> {
  const res = await fetch(`${API_BASE}/api/website-projects/${projectId}/cms-integrations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load connections");
  return res.json() as Promise<CmsConnectionStatus>;
}

export function PublishDialog({
  open,
  onClose,
  onPublished,
  pieceId,
  projectId,
  token,
  formatType,
}: {
  open: boolean;
  onClose: () => void;
  onPublished: (updated: ContentPiece) => void;
  pieceId: number;
  projectId: number;
  token: string | null;
  formatType: ContentFormatType;
}) {
  const [platform, setPlatform] = useState<PublishDestinationId>("wordpress");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformInitialized, setPlatformInitialized] = useState(false);

  const { data: connections = null, isLoading: isLoadingConnections } = useQuery({
    queryKey: ["cms-integrations", projectId, token],
    queryFn: () => fetchCmsIntegrations(projectId, token!),
    enabled: open && Boolean(token),
  });

  const availableDestinations = connections
    ? getConnectedDestinationsForFormat(formatType, connections)
    : [];

  if (open && connections && !platformInitialized && availableDestinations[0]) {
    setPlatform(availableDestinations[0].id);
    setPlatformInitialized(true);
  }
  if (!open && platformInitialized) {
    setPlatformInitialized(false);
  }

  const reset = () => {
    setError(null);
    setIsPublishing(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      const endpoint = getPublishEndpoint(platform, pieceId, API_BASE);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Publish failed");
      }
      const updated = await res.json() as ContentPiece;
      onPublished(updated);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedDestination = availableDestinations.find((d) => d.id === platform);
  const hasConnections = availableDestinations.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Publish Content
          </DialogTitle>
          <DialogDescription>
            Pick where this piece should go.
          </DialogDescription>
        </DialogHeader>

        {isLoadingConnections ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasConnections ? (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-sm text-center space-y-2">
            <p className="font-medium text-foreground">No destinations connected</p>
            <p className="text-muted-foreground">
              Connect a CMS or social account in{" "}
              <strong>Project Settings → Publishing</strong> first.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <div className={`grid gap-2 ${availableDestinations.length === 1 ? "grid-cols-1" : availableDestinations.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {availableDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => { setPlatform(dest.id); setError(null); }}
                    disabled={isPublishing}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-hidden ${
                      platform === dest.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {dest.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedDestination && connections && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-foreground">
                  Connected {selectedDestination.label}
                </p>
                {getConnectionSummary(platform, connections) && (
                  <p className="text-muted-foreground">
                    <code className="text-xs bg-muted px-1 rounded break-all">
                      {getConnectionSummary(platform, connections)}
                    </code>
                  </p>
                )}
                <p className="text-muted-foreground text-xs mt-1">
                  {selectedDestination.description}
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handlePublish}
                disabled={!hasConnections || isPublishing}
                className="flex-1"
              >
                {isPublishing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Publish to {selectedDestination?.label ?? "destination"}</>
                )}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
