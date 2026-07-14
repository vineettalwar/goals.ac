import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2, User, Cpu, Shield, AlertTriangle, KeyRound, CheckCircle2, XCircle, Trash2 } from "lucide-react";

export function SettingsProfileTab(props: Record<string, unknown>) {
    const {
    meData, profileForm, passwordForm, token, user, logout, navigate, toast,
    isSavingProfile, isSavingPassword, onSaveProfile, onChangePassword,
    geminiKeyInput, setGeminiKeyInput, geminiKeyLastFour, isSavingGeminiKey,
    isTestingGeminiKey, isDeletingGeminiKey, geminiTestResult, geminiTestError,
    geminiKeyDialogOpen, setGeminiKeyDialogOpen, onTestGeminiKey, onSaveGeminiKey,
    onRemoveGeminiKey, aiStatus, deleteDialogOpen, setDeleteDialogOpen,
    deleteConfirmEmail, setDeleteConfirmEmail, isDeletingAccount, onDeleteAccount,
    activeProvider, hasGeminiKey, isGoogleOnly,
  } = props as Record<string, unknown> as {
    meData: { hasGoogleId?: boolean; hasPassword?: boolean; hasGeminiKey?: boolean; name?: string; email?: string } | null;
    profileForm: import("react-hook-form").UseFormReturn<{ name: string; avatarUrl: string }>;
    passwordForm: import("react-hook-form").UseFormReturn<{ currentPassword: string; newPassword: string; confirmPassword: string }>;
    token: string | null;
    user: { name?: string; email?: string } | null;
    logout: () => void;
    navigate: ReturnType<typeof import("react-router-dom").useNavigate>;
    toast: (args: { title: string; variant?: "destructive" }) => void;
    isSavingProfile: boolean;
    isSavingPassword: boolean;
    onSaveProfile: (data: { name: string; avatarUrl: string }) => Promise<void>;
    onChangePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>;
    geminiKeyInput: string;
    setGeminiKeyInput: (v: string) => void;
    geminiKeyLastFour: string | null;
    isSavingGeminiKey: boolean;
    isTestingGeminiKey: boolean;
    isDeletingGeminiKey: boolean;
    geminiTestResult: "ok" | "error" | null;
    geminiTestError: string | null;
    geminiKeyDialogOpen: boolean;
    setGeminiKeyDialogOpen: (v: boolean) => void;
    onTestGeminiKey: () => Promise<void>;
    onSaveGeminiKey: () => Promise<void>;
    onRemoveGeminiKey: () => Promise<void>;
    aiStatus: { activeProvider?: string } | null;
    deleteDialogOpen: boolean;
    setDeleteDialogOpen: (v: boolean) => void;
    deleteConfirmEmail: string;
    setDeleteConfirmEmail: (v: string) => void;
    isDeletingAccount: boolean;
    onDeleteAccount: () => Promise<void>;
    activeProvider?: string;
    hasGeminiKey?: boolean;
    isGoogleOnly?: boolean;
  };

  return (
<>
            <Card className="border-white/7 glass-card-md shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  Profile
                </CardTitle>
                <CardDescription>Update your display name and avatar. Your email address cannot be changed.</CardDescription>
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
                      <label htmlFor="settings-email" className="text-sm font-medium">Email address</label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Input
                          id="settings-email"
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
                      className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                    >
                      {isSavingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save profile"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
</>
  );
}
