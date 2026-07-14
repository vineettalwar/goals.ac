"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { PersonaCard } from "@/components/onboarding/persona-card";

interface Persona {
  id: number;
  name: string;
  ageRange: string;
  jobTitle: string;
  painPoints: string[];
  goals: string[];
  preferredContent: string[];
}

function PersonasPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const companyId = params.get("companyId");

  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>([]);

  useEffect(() => {
    if (!companyId) {
      router.push("/onboarding");
      return;
    }
    router.prefetch(`/onboarding/wordpress?companyId=${companyId}`);
    generatePersonas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function generatePersonas() {
    setLoading(true);
    const res = await fetch("/api/personas/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: parseInt(companyId!, 10) }),
    });

    if (!res.ok) {
      toast.error("Failed to generate personas. Try again.");
      setLoading(false);
      return;
    }

    const { personas: generated } = await res.json();
    setPersonas(generated);
    setLoading(false);
  }

  async function handleUpdate(id: number, field: string, value: string | string[]) {
    const res = await fetch(`/api/personas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      toast.error("Failed to save change");
      return;
    }
    const { persona } = await res.json();
    setPersonas((prev) => prev.map((p) => (p.id === id ? { ...p, ...persona } : p)));
  }

  function handleContinue() {
    router.push(`/onboarding/wordpress?companyId=${companyId}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">goals.ac</span>
          </div>
          <StepIndicator steps={["Company", "Personas", "WordPress"]} current={1} />
          <h1 className="mt-8 text-3xl font-bold">Your marketing personas</h1>
          <p className="mt-2 text-muted-foreground">
            We&apos;ve analyzed your company and created these audience profiles. Click any field to edit.
          </p>
        </div>

        {loading ? (
          <div className="paper-card flex flex-col items-center justify-center gap-4 p-16">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Analyzing your company and audience...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-medium">Next: analyze your competitors</p>
              <p className="text-muted-foreground mt-1">
                After onboarding, run Competitor Analysis to find content and GEO gaps using the URLs you added.
              </p>
            </div>
            {personas.map((persona) => (
              <PersonaCard key={persona.id} persona={persona} onUpdate={handleUpdate} />
            ))}

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={generatePersonas}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </button>
              <Button size="lg" onClick={handleContinue}>
                Continue →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonasPageFallback() {
  return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
}

export default function PersonasPage() {
  return (
    <Suspense fallback={<PersonasPageFallback />}>
      <PersonasPageContent />
    </Suspense>
  );
}
