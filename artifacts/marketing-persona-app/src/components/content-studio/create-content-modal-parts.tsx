"use client";

import type { ReactNode } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WizardStep({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-tight">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl">{subtitle}</p>
      ) : null}
      {children}
    </div>
  );
}

export function OptionCard({
  icon: _icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full border-b border-border py-4 text-left transition-colors hover:bg-secondary/30"
    >
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
        Continue <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

export function StepActions({
  onContinue,
  onSkip,
  continueLabel = "Continue",
  skipLabel = "Skip",
  continueDisabled = false,
}: {
  onContinue: () => void;
  onSkip?: () => void;
  continueLabel?: string;
  skipLabel?: string;
  continueDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 mt-10">
      <Button size="lg" onClick={onContinue} disabled={continueDisabled} className="gap-2">
        {continueLabel}
        <ArrowRight className="w-4 h-4" />
      </Button>
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {skipLabel}
        </button>
      ) : null}
      <p className="text-xs text-muted-foreground/60 w-full sm:w-auto sm:ml-2">
        press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd>
      </p>
    </div>
  );
}

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-5 py-4">
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="font-medium flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
        {value}
      </span>
    </div>
  );
}

export function CompetitorContentGaps({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Content gaps</p>
      <ul className="text-sm text-muted-foreground space-y-1">
        {gaps.slice(0, 3).map((gap) => (
          <li key={gap} className="flex gap-2">
            <span className="text-primary shrink-0">·</span>
            <span>{gap}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
