import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2, User, Cpu, Shield, AlertTriangle, KeyRound, CheckCircle2, XCircle, Trash2 } from "lucide-react";

export function SettingsAccountTab(props: Record<string, unknown>) {
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
            <Card className="border-red-400/20 glass-card-md shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
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
</>
  );
}
