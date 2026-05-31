"use client";

import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileSchema = z.object({
  name: z.string().min(1),
});

const geminiSchema = z.object({
  geminiKey: z.string().min(1, "Enter a Gemini API key"),
});

export default function SettingsPage() {
  const { data: session, update } = useSession();

  const profileForm = useForm({ resolver: zodResolver(profileSchema), values: { name: session?.user.name ?? "" } });
  const geminiForm = useForm({ resolver: zodResolver(geminiSchema), defaultValues: { geminiKey: "" } });

  async function saveProfile(data: { name: string }) {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name }),
    });
    if (!res.ok) { toast.error("Failed to save"); return; }
    await update({ name: data.name });
    toast.success("Profile updated");
  }

  async function saveGeminiKey(data: { geminiKey: string }) {
    const res = await fetch("/api/auth/gemini-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: data.geminiKey }),
    });
    if (!res.ok) { toast.error("Failed to save key"); return; }
    geminiForm.reset();
    toast.success("Gemini API key saved");
  }

  return (
    <div className="px-8 py-8 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold">Account</h2>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{session?.user.email}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" {...profileForm.register("name")} />
        </div>
        <Button onClick={profileForm.handleSubmit(saveProfile)}>Save changes</Button>
      </div>

      {/* Gemini API key */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold">Gemini API key</h2>
        <p className="text-sm text-muted-foreground">
          Optionally provide your own Gemini API key. It&apos;s encrypted and stored securely.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="geminiKey">API key</Label>
          <Input id="geminiKey" type="password" placeholder="AIza..." {...geminiForm.register("geminiKey")} />
        </div>
        <Button onClick={geminiForm.handleSubmit(saveGeminiKey)}>Save key</Button>
      </div>
    </div>
  );
}
