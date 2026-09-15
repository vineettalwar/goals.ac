import { toast } from "sonner";

export type GscSyncResponse = {
  accepted?: boolean;
  queued?: boolean;
  status?: string;
  rowsUpserted?: number;
  opportunitiesInserted?: number;
};

export function isQueuedGscSync(data: GscSyncResponse): boolean {
  return data.accepted === true || data.queued === true || data.status === "queued";
}

export function notifyGscSyncResult(data: GscSyncResponse): void {
  if (isQueuedGscSync(data)) {
    toast.success("Search Console sync started");
    return;
  }
  const rows = data.rowsUpserted ?? 0;
  const ideas = data.opportunitiesInserted ?? 0;
  if (rows === 0) {
    toast.message("Search Console returned no queries for the last 28 days");
    return;
  }
  toast.success(`Synced ${rows} rows · ${ideas} new ideas`);
}
