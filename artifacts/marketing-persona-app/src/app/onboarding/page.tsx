"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { TypeformShell } from "@/components/onboarding/typeform-shell";
import {
  companyNameFromUrl,
  readAutopilotIntent,
  postAutopilotOnboardingRedirect,
} from "@/lib/projects/autopilot-intent";
import { schema, type FormData } from "./onboarding-schema";
import { OnboardingFastLaneForm } from "./onboarding-step-forms";

const FAST_LANE_DEFAULTS = {
  industry: "Other",
  description: "Growing organic traffic with SEO content on autopilot.",
  targetAudience: "Customers searching for our products and services online.",
} as const;

/**
 * Content Autopilot is a separate, pre-existing entry path (see
 * src/lib/projects/autopilot-intent.ts) that skips the Typeform session engine
 * entirely and drops the user straight into /onboarding/fast-lane once a project
 * exists. It predates onboarding_sessions and stays on its own rails here so it
 * keeps working exactly as it did before this rebuild.
 */
function AutopilotBootstrap({ websiteUrl }: { websiteUrl: string }) {
  const router = useRouter();
  const { update } = useSession();
  const scrapedName = companyNameFromUrl(websiteUrl);
  const skipForm = Boolean(scrapedName);
  const [loading, setLoading] = useState(false);
  const autoStarted = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { websiteUrl, name: scrapedName ?? "", ...FAST_LANE_DEFAULTS },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    const name = data.name.trim() || companyNameFromUrl(data.websiteUrl) || data.websiteUrl;

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, name, competitorUrls: [], primaryLanguage: "en" }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to save" }));
      toast.error(error ?? "Failed to save company");
      setLoading(false);
      return;
    }
    const { company, organizationId } = await res.json();
    await update({ companyId: company.id, organizationId: organizationId ?? null, orgRole: "site_admin" });

    const projectRes = await fetch("/api/website-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url: data.websiteUrl }),
    }).catch(() => null);

    let projectId: number | null = null;
    if (projectRes?.ok) {
      const created = (await projectRes.json()) as { id?: number; project?: { id: number } };
      projectId = created.project?.id ?? created.id ?? null;
    } else if (projectRes && projectRes.status !== 409) {
      const { error: projErr } = await projectRes.json().catch(() => ({ error: "Failed to create project" }));
      toast.error(projErr ?? "Failed to create project");
      setLoading(false);
      return;
    }

    if (projectId == null) {
      toast.error("Failed to create project");
      setLoading(false);
      return;
    }
    router.push(postAutopilotOnboardingRedirect(projectId));
  }

  useEffect(() => {
    if (!skipForm || autoStarted.current) return;
    autoStarted.current = true;
    void handleSubmit(onSubmit)();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot mount-only kickoff
  }, [skipForm]);

  if (skipForm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="paper-card flex flex-col items-center gap-3 p-8 py-12">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">
            {loading ? "Creating your project…" : "Using your website to set up…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Confirm your website</h1>
        <p className="mb-6 text-muted-foreground">
          We'll scan it, build a 30-day plan, and queue your first articles.
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <OnboardingFastLaneForm register={register} errors={errors} loading={loading} />
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [autopilotUrl, setAutopilotUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const intent = readAutopilotIntent();
    setAutopilotUrl(intent?.websiteUrl ?? null);
  }, []);

  // Undefined = haven't checked sessionStorage yet (avoids a flash of the wrong flow).
  if (autopilotUrl === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (autopilotUrl) {
    return <AutopilotBootstrap websiteUrl={autopilotUrl} />;
  }

  return <TypeformShell />;
}
