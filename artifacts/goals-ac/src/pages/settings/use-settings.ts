import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

export function useSettings() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("profile");

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Gemini key state
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
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

  const { data: meData = null, isLoading: isLoadingMe, isError: meLoadError } = useQuery({
    queryKey: ["auth-me", token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json() as Promise<MeResponse>;
    },
    enabled: Boolean(token),
  });

  const { data: aiStatus = null } = useQuery({
    queryKey: ["ai-providers-status", token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/ai-providers/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json() as Promise<AiProviderStatus>;
    },
    enabled: Boolean(token),
  });

  const { data: geminiKeyLastFour = null } = useQuery({
    queryKey: ["auth-api-key", token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/auth/api-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const kd = (await res.json()) as { hasKey: boolean; lastFour?: string };
      return kd.hasKey && kd.lastFour ? kd.lastFour : null;
    },
    enabled: Boolean(token && meData?.hasGeminiKey),
  });

  useEffect(() => {
    if (!meData) return;
    profileForm.reset({ name: meData.name, avatarUrl: meData.avatarUrl ?? "" });
  }, [meData, profileForm]);

  useEffect(() => {
    if (meLoadError) {
      toast({ title: "Failed to load profile", variant: "destructive" });
    }
  }, [meLoadError, toast]);

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
      queryClient.setQueryData<MeResponse | null>(["auth-me", token], (prev) =>
        prev ? { ...prev, name: updated.name, avatarUrl: updated.avatarUrl ?? null } : prev,
      );
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
      queryClient.setQueryData<string | null>(["auth-api-key", token], data.lastFour ?? null);
      queryClient.setQueryData<MeResponse | null>(["auth-me", token], (prev) =>
        prev ? { ...prev, hasGeminiKey: true } : prev,
      );
      updateUser({ hasGeminiKey: true });
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
      queryClient.setQueryData<string | null>(["auth-api-key", token], null);
      queryClient.setQueryData<MeResponse | null>(["auth-me", token], (prev) =>
        prev ? { ...prev, hasGeminiKey: false } : prev,
      );
      updateUser({ hasGeminiKey: false });
      toast({ title: "Gemini API key removed" });
    } finally {
      setIsDeletingGeminiKey(false);
    }
  };

  return {
    isLoadingMe, meData, activeTab, setActiveTab, isGoogleOnly: meData ? (meData.hasGoogleId && !meData.hasPassword) : false,
    hasGeminiKey: meData?.hasGeminiKey ?? false,
    activeProvider: aiStatus?.activeProvider ?? "gemini",
    user,
    deleteDialogOpen, setDeleteDialogOpen, deleteConfirmEmail, setDeleteConfirmEmail,
    isDeletingAccount, onDeleteAccount,
    settingsTabProps: {
      meData, profileForm, passwordForm, token, user, logout, navigate, toast,
      isSavingProfile, isSavingPassword, onSaveProfile, onChangePassword,
      geminiKeyInput, setGeminiKeyInput, setGeminiTestResult, geminiKeyLastFour, isSavingGeminiKey,
      isTestingGeminiKey, isDeletingGeminiKey, geminiTestResult, geminiTestError,
      geminiKeyDialogOpen, setGeminiKeyDialogOpen, onTestGeminiKey, onSaveGeminiKey,
      onRemoveGeminiKey, aiStatus, deleteDialogOpen, setDeleteDialogOpen,
      deleteConfirmEmail, setDeleteConfirmEmail, isDeletingAccount, onDeleteAccount,
    },
    geminiKeyDialogOpen, setGeminiKeyDialogOpen,
    geminiKeyInput, setGeminiKeyInput, setGeminiTestResult, geminiTestResult, geminiTestError,
    isTestingGeminiKey, isSavingGeminiKey, onTestGeminiKey, onSaveGeminiKey,
  };
}
