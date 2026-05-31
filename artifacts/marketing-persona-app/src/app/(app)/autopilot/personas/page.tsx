"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PersonaCard } from "@/components/persona-card";

interface Persona {
  id: number;
  name: string;
  ageRange: string;
  jobTitle: string;
  painPoints: string[];
  goals: string[];
  preferredContent: string[];
}

export default function PersonasManagePage() {
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(({ companies }) => {
        if (companies?.[0]) {
          setCompanyId(companies[0].id);
          return fetch(`/api/personas?companyId=${companies[0].id}`);
        }
        return Promise.resolve(null);
      })
      .then((r) => r?.json() ?? null)
      .then((data) => {
        if (data?.personas) setPersonas(data.personas);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdate(id: number, field: string, value: string | string[]) {
    const res = await fetch(`/api/personas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) { toast.error("Failed to save"); return; }
    const { persona } = await res.json();
    setPersonas((prev) => prev.map((p) => (p.id === id ? { ...p, ...persona } : p)));
  }

  async function handleDelete(id: number) {
    await fetch(`/api/personas/${id}`, { method: "DELETE" });
    setPersonas((prev) => prev.filter((p) => p.id !== id));
    toast.success("Persona removed");
  }

  async function handleRegenerate() {
    if (!companyId) return;
    setRegenerating(true);
    const res = await fetch("/api/personas/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    if (!res.ok) { toast.error("Failed to generate personas"); setRegenerating(false); return; }
    const { personas: generated } = await res.json();
    setPersonas((prev) => [...prev, ...generated]);
    setRegenerating(false);
    toast.success(`${generated.length} new personas generated`);
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing personas</h1>
          <p className="mt-1 text-sm text-muted-foreground">These audience profiles guide article generation. Click any field to edit.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <><Spinner size="sm" /> Generating...</> : <><RefreshCw className="h-4 w-4" /> Generate more</>}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-4">
          {personas.map((persona) => (
            <div key={persona.id} className="relative group">
              <PersonaCard persona={persona} onUpdate={handleUpdate} />
              <button
                onClick={() => handleDelete(persona.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
          {personas.length === 0 && (
            <div className="paper-card flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground">No personas yet.</p>
              <Button className="mt-4" onClick={handleRegenerate} disabled={regenerating}>
                <Plus className="h-4 w-4 mr-1.5" /> Generate personas
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
