import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";

const INDUSTRIES = [
  "SaaS / Software",
  "E-commerce",
  "Healthcare",
  "Finance / Fintech",
  "Education",
  "Marketing / Agency",
  "Other",
];

export function AdminOrganizationOnboardPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [createUserIfMissing, setCreateUserIfMissing] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [includeCompany, setIncludeCompany] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("Other");
  const [includeProject, setIncludeProject] = useState(true);

  async function createOrganization() {
    if (!ownerEmail.trim() || !organizationName.trim()) {
      setFlash({ type: "error", message: "Owner email and organization name are required" });
      return;
    }
    if (createUserIfMissing && (!ownerName.trim() || temporaryPassword.length < 8)) {
      setFlash({ type: "error", message: "New users need a name and password (8+ characters)" });
      return;
    }
    if (includeCompany && (!companyName.trim() || !websiteUrl.trim())) {
      setFlash({ type: "error", message: "Company name and website URL are required" });
      return;
    }

    setSubmitting(true);
    setFlash(null);
    try {
      await apiFetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail: ownerEmail.trim(),
          ownerName: ownerName.trim() || undefined,
          createUserIfMissing,
          temporaryPassword: createUserIfMissing ? temporaryPassword : undefined,
          organizationName: organizationName.trim(),
          plan: "starter",
          company: includeCompany
            ? { name: companyName.trim(), websiteUrl: websiteUrl.trim(), industry }
            : undefined,
          firstProject:
            includeProject && includeCompany
              ? { name: companyName.trim() || organizationName.trim(), url: websiteUrl.trim() }
              : undefined,
        }),
      });

      setFlash({ type: "success", message: "Organization onboarded successfully" });
      setOwnerEmail("");
      setOwnerName("");
      setTemporaryPassword("");
      setOrganizationName("");
      setCompanyName("");
      setWebsiteUrl("");
      setTimeout(() => navigate("/admin/organizations"), 1500);
    } catch (err) {
      setFlash({ type: "error", message: err instanceof Error ? err.message : "Failed to create organization" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-6 px-8 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboard organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates an organization on Starter plan. Optionally creates a company profile and first project.
        </p>
      </div>

      {flash ? (
        <div
          className={
            flash.type === "success"
              ? "rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
              : "rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700"
          }
        >
          {flash.message}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="owner-email" className="text-sm font-medium">Owner email</label>
            <input
              id="owner-email"
              type="email"
              placeholder="owner@company.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-name" className="text-sm font-medium">Organization name</label>
            <input
              id="org-name"
              placeholder="Acme Co"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">All new organizations are on the Starter plan (BYOK).</p>
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
              <label htmlFor="owner-name" className="text-sm font-medium">Owner name</label>
              <input
                id="owner-name"
                placeholder="Jane Smith"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="temp-password" className="text-sm font-medium">Temporary password</label>
              <input
                id="temp-password"
                type="password"
                placeholder="Min. 8 characters"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
              <label htmlFor="company-name" className="text-sm font-medium">Company name</label>
              <input
                id="company-name"
                placeholder="Acme Co"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="website-url" className="text-sm font-medium">Website URL</label>
              <input
                id="website-url"
                type="url"
                placeholder="https://acme.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {INDUSTRIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
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

        <button
          type="button"
          onClick={() => void createOrganization()}
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Onboard organization"}
        </button>
      </div>
    </div>
  );
}
