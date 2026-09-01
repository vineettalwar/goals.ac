"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAN_IDS, PLAN_LABELS, type PlanId } from "@/lib/billing/plans";

const VERTICALS = [
  { value: "law", label: "Law" },
  { value: "dental", label: "Dental" },
  { value: "software", label: "Software" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
] as const;

type Vertical = (typeof VERTICALS)[number]["value"];

/**
 * Onboards a firm that isn't on the platform yet. The org itself isn't created here — only at
 * acceptance, once the invited person exists as a user (organizations.owner_id is NOT NULL).
 * Everything below is prefill: the admin fills in whatever it already knows, and the firm fills
 * the rest during onboarding.
 */
export function AdminInviteFirmCard({ onSent }: { onSent?: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [vertical, setVertical] = useState<Vertical | "">("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [plan, setPlan] = useState<PlanId>("starter");

  async function sendInvite() {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/invites/firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          contactName: contactName.trim() || undefined,
          orgName: orgName.trim() || undefined,
          vertical: vertical || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          plan,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send invite");
        return;
      }

      if (data.emailSent) {
        toast.success("Firm invite sent");
      } else if (data.inviteUrl) {
        toast.success("Invite created (email not configured — copy link from response)");
        await navigator.clipboard.writeText(data.inviteUrl as string);
        toast.message("Invite link copied to clipboard");
      } else {
        toast.success("Firm invite created");
      }

      setEmail("");
      setContactName("");
      setOrgName("");
      setVertical("");
      setWebsiteUrl("");
      setPlan("starter");
      onSent?.();
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Invites a brand-new firm. Fill in whatever you already know — the rest gets asked
          during their onboarding.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="firm-invite-email">Email</Label>
        <Input
          id="firm-invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@firm.com"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firm-invite-contact">Contact name</Label>
          <Input
            id="firm-invite-contact"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Jane Smith"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="firm-invite-org-name">Firm name</Label>
          <Input
            id="firm-invite-org-name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Law"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Vertical</Label>
          <Select value={vertical} onValueChange={(v) => setVertical(v as Vertical)}>
            <SelectTrigger>
              <SelectValue placeholder="Select vertical" />
            </SelectTrigger>
            <SelectContent>
              {VERTICALS.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <Select value={plan} onValueChange={(v) => setPlan(v as PlanId)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {PLAN_LABELS[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="firm-invite-website">Website URL</Label>
        <Input
          id="firm-invite-website"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://acmelaw.com"
        />
      </div>

      <div className="flex justify-end pt-1">
        <Button onClick={() => void sendInvite()} disabled={submitting}>
          {submitting ? "Sending…" : "Invite a firm"}
        </Button>
      </div>
    </div>
  );
}
