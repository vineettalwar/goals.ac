"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LeadCaptureModalProps {
  roadmapSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadCaptureModal({ roadmapSlug, open, onOpenChange }: LeadCaptureModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/roadmaps/${roadmapSlug}/lead-capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, companyUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      setTimeout(() => onOpenChange(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">You&apos;re on the list!</DialogTitle>
            <DialogDescription className="text-sm">
              We&apos;ll be in touch shortly with personalised guidance on executing this roadmap.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Get hands-on help executing this roadmap</DialogTitle>
              <DialogDescription>
                Leave your details and we&apos;ll reach out with a tailored automation plan for your business.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="lc-name">Full name</Label>
                <Input
                  id="lc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  minLength={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lc-email">Work email</Label>
                <Input
                  id="lc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@startup.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lc-url">Company website</Label>
                <Input
                  id="lc-url"
                  type="url"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://startup.com"
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting…" : (
                  <><ArrowRight className="w-4 h-4" /> Request growth consultation</>
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
