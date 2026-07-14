"use client";

import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_BEDROCK_MODEL = "anthropic.claude-3-5-haiku-20241022-v1:0";

const SEMRUSH_DATABASES = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
] as const;

export function SettingsApiKeyDialogs({
  geminiDialogOpen, setGeminiDialogOpen, geminiKeyInput, setGeminiKeyInput, geminiTestResult,
  geminiTesting, geminiSaving, testGeminiKey, saveGeminiKey,
  openaiDialogOpen, setOpenaiDialogOpen, openaiKeyInput, setOpenaiKeyInput, openaiTestResult,
  openaiTesting, openaiSaving, testOpenAIKey, saveOpenAIKey,
  anthropicDialogOpen, setAnthropicDialogOpen, anthropicKeyInput, setAnthropicKeyInput, anthropicTestResult,
  anthropicTesting, anthropicSaving, testAnthropicKey, saveAnthropicKey,
  bedrockDialogOpen, setBedrockDialogOpen, bedrockForm, setBedrockForm, bedrockTestResult,
  bedrockTesting, bedrockSaving, testBedrockCredentials, saveBedrockCredentials,
  semrushDialogOpen, setSemrushDialogOpen, semrushApiKeyInput, setSemrushApiKeyInput,
  semrushFormDatabase, setSemrushFormDatabase, semrushTestResult, semrushTesting, semrushSaving,
  testSemrushCredentials, saveSemrushCredentials,
  showSemrushDatabaseHint, suggestedSemrushDatabase, activeProject, contentLanguageLabel, semrushDatabaseLabel,
}: {
  geminiDialogOpen: boolean;
  setGeminiDialogOpen: (open: boolean) => void;
  geminiKeyInput: string;
  setGeminiKeyInput: (v: string) => void;
  geminiTestResult: { ok: boolean; error?: string } | null;
  geminiTesting: boolean;
  geminiSaving: boolean;
  testGeminiKey: () => void;
  saveGeminiKey: () => void;
  openaiDialogOpen: boolean;
  setOpenaiDialogOpen: (open: boolean) => void;
  openaiKeyInput: string;
  setOpenaiKeyInput: (v: string) => void;
  openaiTestResult: { ok: boolean; error?: string } | null;
  openaiTesting: boolean;
  openaiSaving: boolean;
  testOpenAIKey: () => void;
  saveOpenAIKey: () => void;
  anthropicDialogOpen: boolean;
  setAnthropicDialogOpen: (open: boolean) => void;
  anthropicKeyInput: string;
  setAnthropicKeyInput: (v: string) => void;
  anthropicTestResult: { ok: boolean; error?: string } | null;
  anthropicTesting: boolean;
  anthropicSaving: boolean;
  testAnthropicKey: () => void;
  saveAnthropicKey: () => void;
  bedrockDialogOpen: boolean;
  setBedrockDialogOpen: (open: boolean) => void;
  bedrockForm: { accessKeyId: string; secretAccessKey: string; sessionToken: string; region: string; model: string };
  setBedrockForm: React.Dispatch<React.SetStateAction<{ accessKeyId: string; secretAccessKey: string; sessionToken: string; region: string; model: string }>>;
  bedrockTestResult: { ok: boolean; error?: string } | null;
  bedrockTesting: boolean;
  bedrockSaving: boolean;
  testBedrockCredentials: () => void;
  saveBedrockCredentials: () => void;
  semrushDialogOpen: boolean;
  setSemrushDialogOpen: (open: boolean) => void;
  semrushApiKeyInput: string;
  setSemrushApiKeyInput: (v: string) => void;
  semrushFormDatabase: string;
  setSemrushFormDatabase: (v: string) => void;
  semrushTestResult: { ok: boolean; error?: string } | null;
  semrushTesting: boolean;
  semrushSaving: boolean;
  testSemrushCredentials: () => void;
  saveSemrushCredentials: () => void;
  showSemrushDatabaseHint: boolean;
  suggestedSemrushDatabase: string | null | undefined;
  activeProject: { primaryLanguage?: string | null } | null | undefined;
  contentLanguageLabel: (code?: string | null) => string;
  semrushDatabaseLabel: (db: string) => string;
}) {
  return (
    <>
      <Dialog open={geminiDialogOpen} onOpenChange={setGeminiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gemini API key</DialogTitle>
            <DialogDescription>Your key is encrypted and stored securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="AIza..."
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
            />
            {geminiTestResult && (
              <div className={`flex items-center gap-2 text-sm ${geminiTestResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {geminiTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {geminiTestResult.ok ? "Key is valid" : geminiTestResult.error ?? "Key test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={testGeminiKey} disabled={geminiTesting || !geminiKeyInput}>
                {geminiTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button onClick={saveGeminiKey} disabled={geminiSaving || !geminiKeyInput}>
                {geminiSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openaiDialogOpen} onOpenChange={setOpenaiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OpenAI API key</DialogTitle>
            <DialogDescription>Your key is encrypted and stored securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="sk-..."
              value={openaiKeyInput}
              onChange={(e) => setOpenaiKeyInput(e.target.value)}
            />
            {openaiTestResult && (
              <div className={`flex items-center gap-2 text-sm ${openaiTestResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {openaiTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {openaiTestResult.ok ? "Key is valid" : openaiTestResult.error ?? "Key test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={testOpenAIKey} disabled={openaiTesting || !openaiKeyInput}>
                {openaiTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button onClick={saveOpenAIKey} disabled={openaiSaving || !openaiKeyInput}>
                {openaiSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={anthropicDialogOpen} onOpenChange={setAnthropicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anthropic API key</DialogTitle>
            <DialogDescription>Your key is encrypted and stored securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={anthropicKeyInput}
              onChange={(e) => setAnthropicKeyInput(e.target.value)}
            />
            {anthropicTestResult && (
              <div className={`flex items-center gap-2 text-sm ${anthropicTestResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {anthropicTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {anthropicTestResult.ok ? "Key is valid" : anthropicTestResult.error ?? "Key test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={testAnthropicKey} disabled={anthropicTesting || !anthropicKeyInput}>
                {anthropicTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button onClick={saveAnthropicKey} disabled={anthropicSaving || !anthropicKeyInput}>
                {anthropicSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bedrockDialogOpen} onOpenChange={setBedrockDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AWS Bedrock credentials</DialogTitle>
            <DialogDescription>
              Credentials are encrypted and stored securely. Use an IAM user with Bedrock invoke permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bedrock-access-key-id">Access key ID</Label>
              <Input
                id="bedrock-access-key-id"
                type="password"
                placeholder="AKIA..."
                value={bedrockForm.accessKeyId}
                onChange={(e) => setBedrockForm((prev) => ({ ...prev, accessKeyId: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrock-secret-access-key">Secret access key</Label>
              <Input
                id="bedrock-secret-access-key"
                type="password"
                placeholder="Secret key"
                value={bedrockForm.secretAccessKey}
                onChange={(e) => setBedrockForm((prev) => ({ ...prev, secretAccessKey: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrock-session-token">Session token (optional)</Label>
              <Input
                id="bedrock-session-token"
                type="password"
                placeholder="For temporary credentials"
                value={bedrockForm.sessionToken}
                onChange={(e) => setBedrockForm((prev) => ({ ...prev, sessionToken: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bedrock-region">Region</Label>
                <Input
                  id="bedrock-region"
                  placeholder="us-east-1"
                  value={bedrockForm.region}
                  onChange={(e) => setBedrockForm((prev) => ({ ...prev, region: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bedrock-model">Model ID</Label>
                <Input
                  id="bedrock-model"
                  placeholder={DEFAULT_BEDROCK_MODEL}
                  value={bedrockForm.model}
                  onChange={(e) => setBedrockForm((prev) => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>
            {bedrockTestResult && (
              <div className={`flex items-center gap-2 text-sm ${bedrockTestResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {bedrockTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {bedrockTestResult.ok ? "Credentials are valid" : bedrockTestResult.error ?? "Credential test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={testBedrockCredentials}
                disabled={
                  bedrockTesting ||
                  !bedrockForm.accessKeyId.trim() ||
                  !bedrockForm.secretAccessKey.trim() ||
                  !bedrockForm.region.trim() ||
                  !bedrockForm.model.trim()
                }
              >
                {bedrockTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test credentials"}
              </Button>
              <Button
                onClick={saveBedrockCredentials}
                disabled={
                  bedrockSaving ||
                  !bedrockForm.accessKeyId.trim() ||
                  !bedrockForm.secretAccessKey.trim() ||
                  !bedrockForm.region.trim() ||
                  !bedrockForm.model.trim()
                }
              >
                {bedrockSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={semrushDialogOpen} onOpenChange={setSemrushDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Semrush API key</DialogTitle>
            <DialogDescription>
              Your key is encrypted and stored securely. Used for keyword gap analysis and metrics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="semrush-api-key">API key</Label>
              <Input
                id="semrush-api-key"
                type="password"
                placeholder="Semrush API key"
                value={semrushApiKeyInput}
                onChange={(e) => setSemrushApiKeyInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="semrush-database">Regional database</Label>
              <Select value={semrushFormDatabase} onValueChange={setSemrushFormDatabase}>
                <SelectTrigger id="semrush-database">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {SEMRUSH_DATABASES.map((db) => (
                    <SelectItem key={db.value} value={db.value}>
                      {db.label} ({db.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showSemrushDatabaseHint && suggestedSemrushDatabase && (
                <p className="text-xs text-muted-foreground">
                  Suggested for your active project&apos;s language (
                  {contentLanguageLabel(activeProject?.primaryLanguage)}):{" "}
                  {semrushDatabaseLabel(suggestedSemrushDatabase)}
                </p>
              )}
            </div>
            {semrushTestResult && (
              <div className={`flex items-center gap-2 text-sm ${semrushTestResult.ok ? "text-emerald-600" : "text-destructive"}`}>
                {semrushTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {semrushTestResult.ok ? "API key is valid" : semrushTestResult.error ?? "Key test failed"}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={testSemrushCredentials}
                disabled={semrushTesting || !semrushApiKeyInput.trim()}
              >
                {semrushTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test key"}
              </Button>
              <Button onClick={saveSemrushCredentials} disabled={semrushSaving || !semrushApiKeyInput.trim()}>
                {semrushSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
