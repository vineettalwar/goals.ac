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
import { Loader2, User, Lock, Trash2, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MeResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  hasPassword: boolean;
  hasGoogleId: boolean;
}

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
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

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "" },
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
        profileForm.reset({ name: data.name });
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
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: data.name }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to save profile", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      updateUser({ name: updated.name });
      setMeData((prev) => prev ? { ...prev, name: updated.name } : prev);
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
