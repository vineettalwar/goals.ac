"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Link2, Loader2 } from "lucide-react";
import {
  PublishBrandIcon,
  type PublishBrandIconId,
} from "@workspace/app-shell/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type ConnectionFieldDef } from "@/lib/integrations/cms/cms-connection-schemas";
import {
  type ConnectionMethod,
  type PublishDestinationDefinition,
  getConnectionMethodLabel,
  supportsMultipleConnectionMethods,
} from "@/lib/projects/publishing-destinations";

const WIZARD_EASE = [0.16, 1, 0.3, 1] as const;

type WizardStep =
  | { kind: "method" }
  | { kind: "field"; field: ConnectionFieldDef };

export function DestinationBadge({
  destination,
}: {
  destination: PublishDestinationDefinition;
}) {
  return <PublishBrandIcon id={destination.id as PublishBrandIconId} className="h-8 w-8" />;
}

function fieldStepComplete(
  field: ConnectionFieldDef,
  value: string,
): boolean {
  if (field.required === false) return true;
  if (field.type === "select") return Boolean(value || field.defaultValue);
  return value.trim().length > 0;
}

function buildWizardSteps(
  destination: PublishDestinationDefinition,
  visibleFields: ConnectionFieldDef[],
): WizardStep[] {
  const steps: WizardStep[] = [];
  if (supportsMultipleConnectionMethods(destination.id)) {
    steps.push({ kind: "method" });
  }
  for (const field of visibleFields) {
    steps.push({ kind: "field", field });
  }
  return steps;
}

function WizardChoiceList({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div role="listbox" aria-label="Choose one" className="flex flex-col gap-2">
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-5 py-4 text-left transition-colors",
              "hover:bg-secondary/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              selected && "border-primary ring-1 ring-primary",
            )}
          >
            <span>
              <span className="block font-medium text-foreground">{option.label}</span>
              {option.hint ? (
                <span className="mt-0.5 block text-sm text-muted-foreground">{option.hint}</span>
              ) : null}
            </span>
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border text-xs text-muted-foreground"
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ConnectionField({
  field,
  value,
  disabled,
  onChange,
  destinationId,
  large = false,
  onEnter,
}: {
  field: ConnectionFieldDef;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  destinationId: string;
  large?: boolean;
  onEnter?: () => void;
}) {
  const fieldId = `${destinationId}-${field.key}`;
  const hintId = field.hint ? `${fieldId}-hint` : undefined;
  const requiredMark = field.required ? " *" : "";
  const hasLabel = Boolean(field.label);

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        {hasLabel ? (
          <Label id={`${fieldId}-label`}>
            {field.label}
            {requiredMark}
          </Label>
        ) : null}
        <Select value={value || field.defaultValue || ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger
            aria-labelledby={hasLabel ? `${fieldId}-label` : undefined}
            aria-label={hasLabel ? undefined : field.key}
            aria-required={field.required || undefined}
            aria-describedby={hintId}
            className={large ? "h-14 text-base" : undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.hint ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {field.hint}
          </p>
        ) : null}
      </div>
    );
  }

  const inputType =
    field.type === "password"
      ? "password"
      : field.type === "number"
        ? "number"
        : field.type === "url"
          ? "url"
          : "text";

  return (
    <div className="space-y-1.5">
      {hasLabel ? (
        <Label htmlFor={fieldId}>
          {field.label}
          {requiredMark}
        </Label>
      ) : null}
      <Input
        id={fieldId}
        type={inputType}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        disabled={disabled}
        required={field.required}
        autoFocus={large}
        aria-label={hasLabel ? undefined : field.key}
        aria-required={field.required || undefined}
        aria-describedby={hintId}
        className={large ? "h-14 text-lg" : undefined}
      />
      {field.hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}

export function CmsConnectWizard({
  destination,
  connectionMethod,
  setConnectionMethod,
  formValues,
  setFieldValue,
  visibleFields,
  isSaving,
  canSubmit,
  onSave,
}: {
  destination: PublishDestinationDefinition;
  connectionMethod: ConnectionMethod;
  setConnectionMethod: (method: ConnectionMethod) => void;
  formValues: Record<string, string>;
  setFieldValue: (key: string, value: string) => void;
  visibleFields: ConnectionFieldDef[];
  isSaving: boolean;
  canSubmit: boolean;
  onSave: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const steps = useMemo(
    () => buildWizardSteps(destination, visibleFields),
    [destination, visibleFields],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    setStepIndex((i) => Math.min(i, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  const step = steps[stepIndex] ?? steps[0];
  const isLast = stepIndex >= steps.length - 1;
  const progressPct =
    steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;

  function goNext() {
    if (!step) return;
    if (step.kind === "field") {
      const value = formValues[step.field.key] ?? step.field.defaultValue ?? "";
      if (!fieldStepComplete(step.field, value)) {
        setStepError(`${step.field.label} is required`);
        return;
      }
    }
    setStepError(null);
    if (isLast) {
      if (!canSubmit) return;
      onSave();
      return;
    }
    setDirection(1);
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    if (stepIndex === 0) return;
    setStepError(null);
    setDirection(-1);
    setStepIndex((i) => i - 1);
  }

  const variants = reduceMotion
    ? { enter: { opacity: 1, x: 0 }, center: { opacity: 1, x: 0 }, exit: { opacity: 1, x: 0 } }
    : {
        enter: (dir: 1 | -1) => ({ opacity: 0, x: dir === 1 ? 28 : -28 }),
        center: { opacity: 1, x: 0 },
        exit: (dir: 1 | -1) => ({ opacity: 0, x: dir === 1 ? -28 : 28 }),
      };

  const question =
    step?.kind === "method"
      ? "How do you want to connect?"
      : (step?.field.label ?? "Connect");
  const helper =
    step?.kind === "method"
      ? destination.description
      : (step?.field.hint ?? null);

  const stepKey =
    step?.kind === "method" ? "method" : `field:${step?.field.key ?? "none"}`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <DestinationBadge destination={destination} />
            {destination.label}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </p>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {stepIndex > 0 ? (
        <button
          type="button"
          onClick={goBack}
          disabled={isSaving}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
      ) : null}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: WIZARD_EASE }}
          className="space-y-5"
        >
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {question}
            </h3>
            {helper ? <p className="mt-2 text-sm text-muted-foreground">{helper}</p> : null}
          </div>

          {step?.kind === "method" ? (
            <WizardChoiceList
              value={connectionMethod}
              onSelect={(value) => {
                setConnectionMethod(value as ConnectionMethod);
                setStepError(null);
                setDirection(1);
                setStepIndex(1);
              }}
              options={destination.connectionMethods.map((method) => ({
                value: method,
                label: getConnectionMethodLabel(destination.id, method),
              }))}
            />
          ) : null}

          {step?.kind === "field" && step.field.type === "select" && step.field.options ? (
            <WizardChoiceList
              value={formValues[step.field.key] || step.field.defaultValue || ""}
              onSelect={(value) => {
                setFieldValue(step.field.key, value);
                setStepError(null);
                if (isLast) {
                  // leave user on last step with Connect CTA
                  return;
                }
                setDirection(1);
                setStepIndex((i) => i + 1);
              }}
              options={step.field.options.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          ) : null}

          {step?.kind === "field" && step.field.type !== "select" ? (
            <ConnectionField
              destinationId={destination.id}
              field={{ ...step.field, label: "", hint: undefined }}
              value={formValues[step.field.key] ?? step.field.defaultValue ?? ""}
              disabled={isSaving}
              onChange={(value) => {
                setFieldValue(step.field.key, value);
                setStepError(null);
              }}
              large
              onEnter={goNext}
            />
          ) : null}

          {stepError ? (
            <p role="alert" className="text-sm text-destructive">
              {stepError}
            </p>
          ) : null}

          {step?.kind === "field" && (step.field.type !== "select" || isLast) ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button onClick={goNext} disabled={isSaving || (isLast && !canSubmit)} size="default">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                    Connecting…
                  </>
                ) : isLast ? (
                  <>
                    <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
                    Connect {destination.label}
                  </>
                ) : (
                  <>
                    OK
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </>
                )}
              </Button>
              {!isLast ? (
                <span className="text-xs text-muted-foreground">press Enter ↵</span>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
