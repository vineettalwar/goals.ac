import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, User, Lock, Trash2, AlertTriangle, KeyRound, CheckCircle2, XCircle,
  Cpu, Cloud, Globe, Shield, Server,
} from "lucide-react";

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

interface AiProviderStatus {
  activeProvider: string;
  gemini: { configured: boolean; source: string | null };
  bedrock: { configured: boolean; region: string | null; model: string | null };
  ollama: { configured: boolean; baseUrl: string | null; model: string | null; reachable: boolean };
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

import { SettingsProfileTab } from "./settings-profile-tab";
import { SettingsAiTab } from "./settings-ai-tab";
import { SettingsSecurityTab } from "./settings-security-tab";
import { SettingsAccountTab } from "./settings-account-tab";
import { SettingsGeminiDialog } from "./settings-gemini-dialog";
import { useSettings } from "./use-settings";

export default function Settings() {
  const {
    isLoadingMe, isGoogleOnly, hasGeminiKey, activeProvider, activeTab, setActiveTab, settingsTabProps,
    geminiKeyDialogOpen, setGeminiKeyDialogOpen, geminiKeyInput, setGeminiKeyInput, setGeminiTestResult,
    geminiTestResult, geminiTestError, isTestingGeminiKey, isSavingGeminiKey, onTestGeminiKey, onSaveGeminiKey,
    deleteDialogOpen, setDeleteDialogOpen, deleteConfirmEmail, setDeleteConfirmEmail,
    isDeletingAccount, onDeleteAccount, user,
  } = useSettings();

  if (isLoadingMe) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title="Settings — goals.ac" description="Manage your profile, AI providers, and account settings." />
      <div className="container mx-auto px-4 md:px-8 max-w-3xl py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile, AI providers, and account.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-1.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Cpu className="w-4 h-4 mr-1.5" />
              AI Providers
              {activeProvider && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">
                  {activeProvider}
                </span>
              )}
            </TabsTrigger>
            {!isGoogleOnly && (
              <TabsTrigger value="security">
                <Shield className="w-4 h-4 mr-1.5" />
                Security
              </TabsTrigger>
            )}
            <TabsTrigger value="account">
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ─────────────────────────────────────────── */}
          <SettingsProfileTab {...settingsTabProps} />

          {/* ── AI Providers Tab ────────────────────────────────────── */}
          <SettingsAiTab {...settingsTabProps} />

          {/* ── Security Tab ───────────────────────────────────────── */}
          {!isGoogleOnly && (
            <SettingsSecurityTab {...settingsTabProps} />
          )}

          {/* ── Account Tab ────────────────────────────────────────── */}
          <SettingsAccountTab {...settingsTabProps} />
        </Tabs>
      </div>

      <SettingsGeminiDialog
        open={geminiKeyDialogOpen}
        onOpenChange={setGeminiKeyDialogOpen}
        hasGeminiKey={hasGeminiKey}
        geminiKeyInput={geminiKeyInput}
        setGeminiKeyInput={setGeminiKeyInput}
        setGeminiTestResult={setGeminiTestResult}
        geminiTestResult={geminiTestResult}
        geminiTestError={geminiTestError}
        isTestingGeminiKey={isTestingGeminiKey}
        isSavingGeminiKey={isSavingGeminiKey}
        onTestGeminiKey={onTestGeminiKey}
        onSaveGeminiKey={onSaveGeminiKey}
      />

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
    </AppLayout>
  );
}
