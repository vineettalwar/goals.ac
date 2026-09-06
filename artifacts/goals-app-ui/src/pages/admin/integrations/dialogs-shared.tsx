import { useEffect, useRef, type ReactNode } from "react";
import { ExternalLink, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Local wider dialog (max-w-xl) — SimpleDialog from app-shell is max-w-md
// ---------------------------------------------------------------------------

export function AdminDialog({
  open,
  title,
  onClose,
  loading,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  loading?: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="paper-card fixed left-1/2 top-1/2 z-50 m-0 max-h-[88vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border p-6 shadow-lg backdrop:bg-black/20 backdrop:backdrop-blur-sm"
      onClose={() => !loading && onClose()}
      onCancel={(e) => { if (loading) e.preventDefault(); }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Button helpers
// ---------------------------------------------------------------------------

export const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50";
export const btnOutline =
  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 disabled:opacity-50";

export function DialogFooterRow({ left, right }: { left?: ReactNode; right: ReactNode }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
      <div className="flex flex-wrap gap-2">{left}</div>
      <div className="flex flex-wrap gap-2">{right}</div>
    </div>
  );
}

export function ExternalDocsLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch (native)
// ---------------------------------------------------------------------------

export function ToggleSwitch({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-primary" : "bg-input"}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}
