import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  steps: string[];
  current: number; // 0-indexed
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn("step-dot", {
                active: i === current,
                complete: i < current,
              })}
            >
              {i < current ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span
              className={cn("text-xs whitespace-nowrap", {
                "text-foreground font-medium": i === current,
                "text-primary": i < current,
                "text-muted-foreground": i > current,
              })}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-12 mx-1 mt-[-14px] transition-colors",
                i < current ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
