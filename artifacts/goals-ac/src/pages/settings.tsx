import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Trash2, AlertTriangle, KeyRound, CheckCircle2, XCircle } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MeResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogleId: boolean;
  hasGeminiKey: boolean;
}

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  avatarUrl: z.union([z.string().url("Must be a valid URL"), z.literal("")]).optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function Settings() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [isLoadingMe, setIsLoadingMe] = useState(true);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Gemini key state
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [geminiKeyLastFour, setGeminiKeyLastFour] = useState<string | null>(null);
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [isTestingGeminiKey, setIsTestingGeminiKey] = useState(false);
  const [isDeletingGeminiKey, setIsDeletingGeminiKey] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<"ok" | "error" | null>(null);
  const [geminiTestError, setGeminiTestError] = useState<string | null>(null);
  const [geminiKeyDialogOpen, setGeminiKeyDialogOpen] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", avatarUrl: "" },
  });

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setMeData(data);
        profileForm.reset({ name: data.name, avatarUrl: data.avatarUrl ?? "" });
        if (data.hasGeminiKey) {
          fetch(`${API_BASE}/api/auth/api-key`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((kd: { hasKey: boolean; lastFour?: string }) => {
              if (kd.hasKey && kd.lastFour) setGeminiKeyLastFour(kd.lastFour);
            })
            .catch(() => null);
        }
      })
      .catch(() => {
        toast({ title: "Failed to load profile", variant: "destructive" });
      })
      .finally(() => setIsLoadingMe(false));
  }, [token]);

  const onSaveProfile = async (data: ProfileForm) => {
    if (!token) return;
    setIsSavingProfile(true);
    try {
      const body: Record<string, unknown> = { name: data.name };
      if (data.avatarUrl !== undefined) {
        body.avatarUrl = data.avatarUrl === "" ? null : data.avatarUrl;
      }
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to save profile", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      updateUser({ name: updated.name, avatarUrl: updated.avatarUrl ?? null });
      setMeData((prev) => prev ? { ...prev, name: updated.name, avatarUrl: updated.avatarUrl ?? null } : prev);
      toast({ title: "Profile saved" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordForm) => {
    if (!token) return;
    setIsSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        passwordForm.setError("currentPassword", { message: err.error ?? "Failed to change password" });
        return;
      }
      passwordForm.reset();
      toast({ title: "Password changed successfully" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const onDeleteAccount = async () => {
    if (!token || !user) return;
    if (deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to delete account", variant: "destructive" });
        return;
      }
      logout();
      navigate("/", { replace: true });
    } finally {
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  const onTestGeminiKey = async () => {
    if (!token || !geminiKeyInput.trim()) return;
    setIsTestingGeminiKey(true);
    setGeminiTestResult(null);
    setGeminiTestError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/api-key/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: geminiKeyInput.trim() }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setGeminiTestResult("ok");
      } else {
        setGeminiTestResult("error");
        setGeminiTestError(data.error ?? "Key validation failed");
      }
    } catch {
      setGeminiTestResult("error");
      setGeminiTestError("Network error — please try again");
    } finally {
      setIsTestingGeminiKey(false);
    }
  };

  const onSaveGeminiKey = async () => {
    if (!token || !geminiKeyInput.trim()) return;
    setIsSavingGeminiKey(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/api-key`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: geminiKeyInput.trim() }),
      });
      const data = await res.json() as { ok: boolean; lastFour?: string; error?: string };
      if (!res.ok || !data.ok) {
        toast({ title: data.error ?? "Failed to save key", variant: "destructive" });
        return;
      }
      setGeminiKeyLastFour(data.lastFour ?? null);
      setMeData((prev) => prev ? { ...prev, hasGeminiKey: true } : prev);
      setGeminiKeyInput("");
      setGeminiTestResult(null);
      setGeminiKeyDialogOpen(false);
      toast({ title: "Gemini API key saved" });
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const onRemoveGeminiKey = async () => {
    if (!token) return;
    setIsDeletingGeminiKey(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/api-key`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to remove key", variant: "destructive" });
        return;
      }
      setGeminiKeyLastFour(null);
      setMeData((prev) => prev ? { ...prev, hasGeminiKey: false } : prev);
      toast({ title: "Gemini API key removed" });
    } finally {
      setIsDeletingGeminiKey(false);
    }
  };

  if (isLoadingMe) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const isGoogleOnly = meData ? (meData.hasGoogleId && !meData.hasPassword) : false;
  const hasGeminiKey = meData?.hasGeminiKey ?? false;

  return (
    <Layout>
      <SEO title="Account Settings — goals.ac" description="Manage your profile, password, and account." />
      <div className="container mx-auto px-4 md:px-8 max-w-2xl py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and account preferences.</p>
        </div>

        <div className="space-y-8">
          {/* Profile */}
          <Card className="border-white/[0.07] glass-card-md shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-blue-400" />
                Profile
              </CardTitle>
              <CardDescription>Update your display name. Your email address cannot be changed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="avatarUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/photo.jpg" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Paste a publicly accessible image URL. Leave blank to use your initials.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel className="text-sm font-medium">Email address</FormLabel>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Input
                        value={meData?.email ?? ""}
                        disabled
                        className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                      />
                      {isGoogleOnly && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">via Google</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">Email changes are not supported at this time.</p>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
                  >
                    {isSavingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* AI Integration */}
          <Card className="border-white/[0.07] glass-card-md shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="w-4 h-4 text-blue-400" />
                AI Integration
              </CardTitle>
              <CardDescription>
                Bring your own Gemini API key to route all AI generation through your account.
                Your key is stored encrypted and never exposed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasGeminiKey ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-300">Gemini API key connected</p>
                      <p className="text-xs text-muted-foreground">Ending in ••••{geminiKeyLastFour ?? "••••"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiKeyDialogOpen(true); }}
                      className="border-white/10 hover:border-white/20"
                    >
                      Replace key
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRemoveGeminiKey}
                      disabled={isDeletingGeminiKey}
                      className="border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/50"
                    >
                      {isDeletingGeminiKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No key connected. Generations use the platform's shared quota.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiKeyDialogOpen(true); }}
                    className="border-white/10 hover:border-white/20"
                  >
                    <KeyRound className="mr-2 h-3.5 w-3.5" />
                    Add Gemini API key
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Get a free key at{" "}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      aistudio.google.com
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change password — only for email/password accounts */}
          {!isGoogleOnly && (
            <Card className="border-white/[0.07] glass-card-md shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="w-4 h-4 text-blue-400" />
                  Change password
                </CardTitle>
                <CardDescription>Choose a strong password with at least 8 characters.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm new password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={isSavingPassword}
                      className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
                    >
                      {isSavingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</> : "Update password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Danger zone */}
          <Card className="border-red-400/20 glass-card-md shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Danger zone
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/50"
                onClick={() => {
                  setDeleteConfirmEmail("");
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete my account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gemini key dialog */}
      <Dialog open={geminiKeyDialogOpen} onOpenChange={setGeminiKeyDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              {hasGeminiKey ? "Replace Gemini API Key" : "Add Gemini API Key"}
            </DialogTitle>
            <DialogDescription>
              Your key is encrypted with AES-256 before storage and never logged or exposed. It's used only to route AI generation requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">API Key</label>
              <Input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => { setGeminiKeyInput(e.target.value); setGeminiTestResult(null); }}
                placeholder="AIza…"
                className="font-mono"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Get a free key at{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  aistudio.google.com
                </a>
              </p>
            </div>

            {geminiTestResult === "ok" && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Key is valid and working
              </div>
            )}
            {geminiTestResult === "error" && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{geminiTestError ?? "Key validation failed"}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={onTestGeminiKey}
              disabled={!geminiKeyInput.trim() || isTestingGeminiKey || isSavingGeminiKey}
              className="border-white/10 hover:border-white/20"
            >
              {isTestingGeminiKey ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testing…</> : "Test key"}
            </Button>
            <Button
              onClick={onSaveGeminiKey}
              disabled={!geminiKeyInput.trim() || isSavingGeminiKey || isTestingGeminiKey}
              className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
            >
              {isSavingGeminiKey ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your website projects, brand profiles, and generated content.
              <strong className="text-foreground block mt-3">This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Type your email address <span className="font-mono text-foreground font-medium">{user?.email}</span> to confirm:
            </p>
            <Input
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user?.email ?? ""}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteAccount}
              disabled={
                isDeletingAccount ||
                deleteConfirmEmail.trim().toLowerCase() !== (user?.email ?? "").toLowerCase()
              }
            >
              {isDeletingAccount ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
