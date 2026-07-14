import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2, User, Cpu, Shield, AlertTriangle, KeyRound, CheckCircle2, XCircle, Trash2, Cloud, Server, Globe } from "lucide-react";

export function SettingsAiTab(props: Record<string, unknown>) {
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
            {/* Active provider indicator */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <Cpu className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Active provider: <span className="capitalize text-blue-600 dark:text-blue-400">{activeProvider}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All AI features (brand scanning, content generation, SEO) use this provider.
                  Configure via the <code className="px-1 py-0.5 rounded bg-muted text-xs">AI_PROVIDER</code> env var.
                </p>
              </div>
            </div>

            {/* Gemini */}
            <Card className="border-white/7 glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="text-blue-500 dark:text-blue-400 font-bold text-lg">G</span>
                      Google Gemini
                    </CardTitle>
                    <CardDescription>
                      Bring your own API key to route AI generation through your Gemini account.
                      Your key is stored encrypted and never exposed.
                    </CardDescription>
                  </div>
                  {activeProvider === "gemini" && (
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hasGeminiKey ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Gemini API key connected</p>
                        <p className="text-xs text-muted-foreground">Ending in ••••{geminiKeyLastFour ?? "••••"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiKeyDialogOpen(true); }}
                      >
                        Replace key
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRemoveGeminiKey}
                        disabled={isDeletingGeminiKey}
                        className="border-red-400/30 text-red-500 dark:text-red-400 hover:bg-red-400/10 hover:text-red-500 dark:hover:text-red-400 hover:border-red-400/50"
                      >
                        {isDeletingGeminiKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove key"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No key connected. Generations use the platform's shared quota (if available).
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setGeminiKeyInput(""); setGeminiTestResult(null); setGeminiKeyDialogOpen(true); }}
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
                        className="text-blue-500 dark:text-blue-400 hover:underline"
                      >
                        aistudio.google.com
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AWS Bedrock */}
            <Card className="border-white/7 glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Cloud className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      AWS Bedrock
                    </CardTitle>
                    <CardDescription>
                      Use Claude, Llama, or other models via AWS Bedrock. Requires AWS credentials configured on the server.
                    </CardDescription>
                  </div>
                  {activeProvider === "bedrock" && (
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {aiStatus?.bedrock.configured ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">Bedrock configured</p>
                        <p className="text-xs text-muted-foreground">
                          Region: {aiStatus.bedrock.region ?? "us-east-1"} · Model: {aiStatus.bedrock.model ?? "default"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">Not configured on this server</p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <p>To enable Bedrock, add these env vars to your server:</p>
                      <pre className="p-2 rounded bg-muted text-xs overflow-x-auto"><code>{`AI_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL=anthropic.claude-3-5-haiku-20241022-v1:0`}</code></pre>
                      <p>Then install the SDK: <code className="px-1 py-0.5 rounded bg-muted">pnpm add -D @aws-sdk/client-bedrock-runtime</code></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ollama */}
            <Card className="border-white/7 glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      Ollama (Local)
                    </CardTitle>
                    <CardDescription>
                      Run open-source models locally. Free and private — no API key needed.
                    </CardDescription>
                  </div>
                  {activeProvider === "ollama" && (
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {aiStatus?.ollama.configured ? (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${aiStatus.ollama.reachable ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                      {aiStatus.ollama.reachable ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${aiStatus.ollama.reachable ? "text-green-800 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                          {aiStatus.ollama.reachable ? "Ollama connected" : "Ollama unreachable"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          URL: {aiStatus.ollama.baseUrl ?? "http://localhost:11434"} · Model: {aiStatus.ollama.model ?? "default"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">Not configured on this server</p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <p>To enable Ollama, add these env vars:</p>
                      <pre className="p-2 rounded bg-muted text-xs overflow-x-auto"><code>{`AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e2b`}</code></pre>
                      <p>Then install Ollama from{" "}
                        <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">ollama.com</a>
                        {" "}and pull a model: <code className="px-1 py-0.5 rounded bg-muted">ollama pull gemma4:e2b</code></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
</>
  );
}
