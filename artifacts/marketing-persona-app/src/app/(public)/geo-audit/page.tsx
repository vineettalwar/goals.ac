"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export default function GeoAuditFormPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);

    const res = await fetch("/api/geo-audits/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    setLoading(false);
    if (!res.ok) { toast.error("Audit failed — please check the URL and try again"); return; }
    const data = await res.json();
    router.push(`/geo-audit/${data.id ?? data.audit?.id}`);
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-24 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">GEO Audit</h1>
        <p className="text-muted-foreground leading-relaxed">
          Check how well your page is optimised for AI-powered search engines (Generative Engine Optimisation). Get a score and actionable fixes.
        </p>
      </div>

      <form onSubmit={handleAudit} className="paper-card rounded-xl p-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="url">Website URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://yoursite.com/your-page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Enter the exact page URL you want to audit</p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <><Spinner size="sm" /> Auditing…</> : <><Search className="h-4 w-4" /> Run GEO audit</>}
        </Button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
        {["Title & Meta", "Schema.org", "H1/H2 structure", "Open Graph"].map((check) => (
          <div key={check} className="paper-card rounded-xl p-4">
            <p className="font-medium text-xs">{check}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
