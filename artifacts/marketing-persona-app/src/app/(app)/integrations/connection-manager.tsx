"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Plus, Trash2, RefreshCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type Provider = "ghost" | "webhook";

export interface IntegrationConnection {
  id: number;
  companyId: number;
  provider: Provider;
  name: string;
  url: string | null;
  defaultStatus: string;
  lastTestedAt: string | null;
  lastTestOk: boolean;
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_STATUS_OPTIONS: Record<Provider, { value: string; label: string }[]> = {
  ghost: [
    { value: "draft", label: "Draft (review first)" },
    { value: "published", label: "Published (live immediately)" },
  ],
  webhook: [
    { value: "draft", label: "Draft" },
    { value: "publish", label: "Publish" },
  ],
};

const connectionSchema = z.object({
  name: z.string().min(1, "Give this connection a name"),
  url: z.string().url("Enter a valid URL"),
  secret: z.string().min(1, "Required"),
  defaultStatus: z.string().min(1),
});
type ConnectionFormData = z.infer<typeof connectionSchema>;

function StatusBadge({ connection }: { connection: IntegrationConnection }) {
  if (!connection.lastTestedAt) {
    return <Badge variant="muted">Not tested</Badge>;
  }
  return connection.lastTestOk ? (
    <Badge variant="success" className="flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" /> Connected
    </Badge>
  ) : (
    <Badge variant="destructive" className="flex items-center gap-1">
      <XCircle className="h-3 w-3" /> Failed
    </Badge>
  );
}

interface ConnectionFormDialogProps {
  provider: Provider;
  companyId: number;
  connection?: IntegrationConnection;
  onSaved: () => void;
  trigger: React.ReactNode;
}

function ConnectionFormDialog({ provider, companyId, connection, onSaved, trigger }: ConnectionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = !!connection;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ConnectionFormData>({
    resolver: zodResolver(isEdit ? connectionSchema.partial({ secret: true }) : connectionSchema),
    defaultValues: {
      name: connection?.name ?? "",
      url: connection?.url ?? "",
      secret: "",
      defaultStatus: connection?.defaultStatus ?? "draft",
    },
  });

  async function onSubmit(data: ConnectionFormData) {
    setSaving(true);
    const body = isEdit
      ? { ...data, secret: data.secret || undefined }
      : { ...data, companyId, provider };

    const res = await fetch(isEdit ? `/api/integrations/${connection.id}` : "/api/integrations", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Failed to save connection" }));
      toast.error(msg ?? "Failed to save connection");
      return;
    }

    const { testResult } = await res.json().catch(() => ({ testResult: undefined }));
    setOpen(false);
    reset();
    onSaved();
    if (testResult && !testResult.ok) {
      toast.warning(`Saved, but the test connection failed: ${testResult.error ?? "unknown error"}`);
    } else {
      toast.success(isEdit ? "Connection updated" : "Connection added");
    }
  }

  const statusOptions = PROVIDER_STATUS_OPTIONS[provider];
  const urlLabel = provider === "ghost" ? "Ghost Admin API URL" : "Webhook URL";
  const secretLabel = provider === "ghost" ? "Admin API key" : "Signing secret";

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${connection.name}` : `Connect ${provider === "ghost" ? "Ghost" : "Webhook"}`}</DialogTitle>
          <DialogDescription>
            {provider === "ghost"
              ? "Credentials are encrypted at rest and used only to sign short-lived Admin API tokens."
              : "We'll POST the full article JSON to this URL, signed with an HMAC-SHA256 header so you can verify authenticity."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Connection name</Label>
            <Input id="name" placeholder={provider === "ghost" ? "My Ghost blog" : "Zapier"} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">{urlLabel}</Label>
            <Input
              id="url"
              placeholder={provider === "ghost" ? "https://yourblog.ghost.io" : "https://hooks.zapier.com/..."}
              {...register("url")}
            />
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secret">{secretLabel}</Label>
            <Input
              id="secret"
              type="password"
              placeholder={isEdit ? "Leave blank to keep the current value" : provider === "ghost" ? "id:secret" : "your signing secret"}
              {...register("secret")}
            />
            {errors.secret && <p className="text-xs text-destructive">{errors.secret.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Publish articles as</Label>
            <div className="flex gap-4">
              {statusOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" value={opt.value} {...register("defaultStatus")} className="accent-primary" />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? <><Spinner size="sm" className="border-white/30 border-t-white" /> Saving...</> : "Save connection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionManager({ provider, companyId }: { provider: Provider; companyId: number }) {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    const res = await fetch(`/api/integrations?companyId=${companyId}`);
    const data = await res.json().catch(() => ({ connections: [] }));
    setConnections((data.connections ?? []).filter((c: IntegrationConnection) => c.provider === provider));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleTest(id: number) {
    setTestingId(id);
    const res = await fetch(`/api/integrations/${id}/test`, { method: "POST" });
    const result = await res.json().catch(() => ({ ok: false, error: "Test failed" }));
    setTestingId(null);
    if (result.ok) toast.success("Connection is healthy");
    else toast.error(result.error ?? "Connection test failed");
    refresh();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const res = await fetch(`/api/integrations/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) { toast.error("Failed to delete connection"); return; }
    toast.success("Connection removed");
    refresh();
  }

  return (
    <div className="space-y-3">
      {loading && <p className="text-sm text-muted-foreground">Loading connections...</p>}

      {!loading && connections.length === 0 && (
        <p className="text-sm text-muted-foreground">No {provider === "ghost" ? "Ghost" : "webhook"} connections yet.</p>
      )}

      {connections.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{c.name}</p>
              <StatusBadge connection={c} />
            </div>
            <p className="text-xs text-muted-foreground truncate">{c.url}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => handleTest(c.id)} disabled={testingId === c.id} title="Test connection">
              {testingId === c.id ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <ConnectionFormDialog
              provider={provider}
              companyId={companyId}
              connection={c}
              onSaved={refresh}
              trigger={
                <Button variant="ghost" size="icon" title="Edit connection">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(c.id)}
              disabled={deletingId === c.id}
              title="Delete connection"
            >
              {deletingId === c.id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4 text-destructive" />}
            </Button>
          </div>
        </div>
      ))}

      <ConnectionFormDialog
        provider={provider}
        companyId={companyId}
        onSaved={refresh}
        trigger={
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4" /> Add {provider === "ghost" ? "Ghost" : "webhook"} connection
          </Button>
        }
      />
    </div>
  );
}
