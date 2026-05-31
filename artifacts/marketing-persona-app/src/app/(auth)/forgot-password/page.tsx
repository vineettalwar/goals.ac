"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Trigger password reset email via API
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send reset instructions</p>
      </div>

      {sent ? (
        <div className="paper-card rounded-xl p-5 text-center space-y-3">
          <p className="font-medium">Check your email</p>
          <p className="text-sm text-muted-foreground">If an account exists for {email}, you&apos;ll receive a password reset link shortly.</p>
          <Link href="/login">
            <Button variant="outline" className="w-full">Back to login</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="paper-card rounded-xl p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-primary">Back to login</Link>
          </p>
        </form>
      )}
    </div>
  );
}
