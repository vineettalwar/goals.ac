import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, KeyRound, CheckCircle2, XCircle } from "lucide-react";

export function SettingsGeminiDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hasGeminiKey: boolean;
  geminiKeyInput: string;
  setGeminiKeyInput: (v: string) => void;
  setGeminiTestResult: (v: "ok" | "error" | null) => void;
  geminiTestResult: "ok" | "error" | null;
  geminiTestError: string | null;
  isTestingGeminiKey: boolean;
  isSavingGeminiKey: boolean;
  onTestGeminiKey: () => void;
  onSaveGeminiKey: () => void;
}) {
  const {
    open, onOpenChange, hasGeminiKey, geminiKeyInput, setGeminiKeyInput, setGeminiTestResult,
    geminiTestResult, geminiTestError, isTestingGeminiKey, isSavingGeminiKey, onTestGeminiKey, onSaveGeminiKey,
  } = props;
      <Dialog open={geminiKeyDialogOpen} onOpenChange={setGeminiKeyDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              {hasGeminiKey ? "Replace Gemini API Key" : "Add Gemini API Key"}
            </DialogTitle>
            <DialogDescription>
              Your key is encrypted with AES-256 before storage and never logged or exposed. It's used only to route AI generation requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label htmlFor="gemini-api-key" className="text-sm font-medium text-foreground block mb-1.5">API Key</label>
              <Input
                id="gemini-api-key"
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
                  className="text-blue-500 dark:text-blue-400 hover:underline"
                >
                  aistudio.google.com
                </a>
              </p>
            </div>

            {geminiTestResult === "ok" && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Key is valid and working
              </div>
            )}
            {geminiTestResult === "error" && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-700 dark:text-red-300">
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
            >
              {isTestingGeminiKey ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testing…</> : "Test key"}
            </Button>
            <Button
              onClick={onSaveGeminiKey}
              disabled={!geminiKeyInput.trim() || isSavingGeminiKey || isTestingGeminiKey}
              className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
            >
              {isSavingGeminiKey ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
}
