import { inputClassName } from "@workspace/app-shell";
import type { PlatformIntegrationDefinition } from "./types";

export function SecretField({
  id,
  label,
  placeholder,
  value,
  onChange,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClassName} font-mono text-xs`}
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EnvManagedBanner({ envVars }: { envVars: string[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Managed via server environment</p>
      <p className="mt-1">
        Set these in your deployment env vars and restart the server. Values cannot be changed from
        admin.
      </p>
      {envVars.length > 0 ? (
        <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
          {envVars.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function EnvVarChecklist({
  envVars,
}: {
  envVars: PlatformIntegrationDefinition["envVars"];
}) {
  return (
    <ul className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      {envVars.map((envVar) => (
        <li key={envVar.name} className="flex items-center justify-between gap-3 text-xs">
          <span className="font-mono text-[11px]">{envVar.name}</span>
          <span
            className={
              envVar.configured
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            }
          >
            {envVar.configured ? "Set" : envVar.required ? "Missing" : "Optional"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SourceNote({
  configured,
  source,
  lastFour,
  managedByEnv,
}: {
  configured: boolean;
  source: "db" | "env" | null;
  lastFour?: string | null;
  managedByEnv?: boolean;
}) {
  if (managedByEnv) return null;
  if (!configured) {
    return <p className="text-[11px] text-muted-foreground">Not configured yet.</p>;
  }
  if (source === "env") {
    return (
      <p className="text-[11px] text-muted-foreground">
        Loaded from server environment{lastFour ? ` (••••${lastFour})` : ""}.
      </p>
    );
  }
  return (
    <p className="text-[11px] text-muted-foreground">
      Stored securely{lastFour ? ` — ends with ••••${lastFour}` : ""}.
    </p>
  );
}
