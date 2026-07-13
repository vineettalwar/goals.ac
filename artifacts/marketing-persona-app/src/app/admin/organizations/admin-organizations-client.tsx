"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

interface OrganizationRow {
  id: number;
  name: string;
  plan: "starter" | "growth" | "scale";
  ownerEmail: string;
  ownerName: string;
  projectCount: number;
  memberCount: number;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

const PLANS = ["starter", "growth", "scale"] as const;
const INDUSTRIES = [
  "SaaS / Software",
  "E-commerce",
  "Healthcare",
  "Finance / Fintech",
  "Education",
  "Marketing / Agency",
  "Other",
];

export function AdminOrganizationsClient() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [createUserIfMissing, setCreateUserIfMissing] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("starter");
  const [includeCompany, setIncludeCompany] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("Other");
  const [includeProject, setIncludeProject] = useState(true);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizations");
      if (!res.ok) throw new Error("Failed to load organizations");
      const data = (await res.json()) as { organizations: OrganizationRow[] };
      setOrganizations(data.organizations);
    } catch {
      toast.error("Could not load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  async function createOrganization() {
    if (!ownerEmail.trim() || !organizationName.trim()) {
      toast.error("Owner email and organization name are required");
      return;
    }
    if (createUserIfMissing && (!ownerName.trim() || temporaryPassword.length < 8)) {
      toast.error("New users need a name and password (8+ characters)");
      return;
    }
    if (includeCompany && (!companyName.trim() || !websiteUrl.trim())) {
      toast.error("Company name and website URL are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail: ownerEmail.trim(),
          ownerName: ownerName.trim() || undefined,
          createUserIfMissing,
          temporaryPassword: createUserIfMissing ? temporaryPassword : undefined,
          organizationName: organizationName.trim(),
          plan,
          company: includeCompany
            ? {
                name: companyName.trim(),
                websiteUrl: websiteUrl.trim(),
                industry,
              }
            : undefined,
          firstProject:
            includeProject && includeCompany
              ? {
                  name: companyName.trim() || organizationName.trim(),
                  url: websiteUrl.trim(),
                }
              : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create organization");
      }

      toast.success("Organization onboarded");
      setOwnerEmail("");
      setOwnerName("");
      setTemporaryPassword("");
      setOrganizationName("");
      setCompanyName("");
      setWebsiteUrl("");
      await loadOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSuspend(org: OrganizationRow) {
    try {
      if (org.suspendedAt) {
        const res = await fetch(`/api/admin/organizations/suspend?organizationId=${org.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to unsuspend");
        toast.success(`${org.name} unsuspended`);
      } else {
        const reason = window.prompt("Suspension reason (optional):") ?? undefined;
        const res = await fetch("/api/admin/organizations/suspend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: org.id, reason }),
        });
        if (!res.ok) throw new Error("Failed to suspend");
        toast.success(`${org.name} suspended`);
      }
      await loadOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard new customers and assign a site admin owner.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
      </div>

      <div className="paper-card p-5 space-y-5">
        <div>
          <h2 className="text-sm font-semibold">Onboard organization</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Creates an org with the owner as site admin. Optionally creates their company profile and first site.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="owner-email">Owner email</Label>
            <Input
              id="owner-email"
              type="email"
              placeholder="owner@company.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              placeholder="Acme Co"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={(value) => setPlan(value as (typeof PLANS)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={createUserIfMissing}
            onChange={(e) => setCreateUserIfMissing(e.target.checked)}
            className="rounded border-border"
          />
          Create user account if email is not registered
        </label>

        {createUserIfMissing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="owner-name">Owner name</Label>
              <Input
                id="owner-name"
                placeholder="Jane Smith"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temp-password">Temporary password</Label>
              <Input
                id="temp-password"
                type="password"
                placeholder="Min. 8 characters"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
              />
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeCompany}
            onChange={(e) => setIncludeCompany(e.target.checked)}
            className="rounded border-border"
          />
          Create company profile (marks onboarding complete)
        </label>

        {includeCompany && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                placeholder="Acme Co"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website-url">Website URL</Label>
              <Input
                id="website-url"
                type="url"
                placeholder="https://acme.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {includeCompany && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeProject}
              onChange={(e) => setIncludeProject(e.target.checked)}
              className="rounded border-border"
            />
            Create first website project from company details
          </label>
        )}

        <Button onClick={() => void createOrganization()} disabled={submitting}>
          {submitting ? "Creating…" : "Onboard organization"}
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">All organizations</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading organizations…</p>
        ) : organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        ) : (
          organizations.map((org) => (
            <div
              key={org.id}
              className="paper-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{org.name}</p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {org.plan}
                  </Badge>
                  {org.suspendedAt && (
                    <Badge variant="destructive" className="text-xs">
                      Suspended
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Owner: {org.ownerName} ({org.ownerEmail})
                </p>
                {org.suspendedReason && (
                  <p className="text-xs text-destructive mt-1">Reason: {org.suspendedReason}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(org.createdAt).toLocaleDateString()} · {org.memberCount} members ·{" "}
                  {org.projectCount} sites
                </p>
              </div>
              <Button
                variant={org.suspendedAt ? "outline" : "destructive"}
                size="sm"
                onClick={() => void toggleSuspend(org)}
              >
                {org.suspendedAt ? "Unsuspend" : "Suspend"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
