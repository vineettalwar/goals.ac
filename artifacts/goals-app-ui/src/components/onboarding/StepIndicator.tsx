import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  current: number;
}

function stepDotClass(index: number, current: number): string {
  if (index < current) return "step-dot complete";
  if (index === current) return "step-dot active";
  return "step-dot";
}

function stepLabelClass(index: number, current: number): string {
  if (index === current) return "text-xs whitespace-nowrap text-foreground font-medium";
  if (index < current) return "text-xs whitespace-nowrap text-primary";
  return "text-xs whitespace-nowrap text-muted-foreground";
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, index) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={stepDotClass(index, current)}>
              {index < current ? <Check className="h-3 w-3" /> : index + 1}
            </div>
            <span className={stepLabelClass(index, current)}>{label}</span>
          </div>
          {index < steps.length - 1 ? (
            <div
              className={`mx-1 mt-[-14px] h-px w-12 transition-colors ${
                index < current ? "bg-primary" : "bg-border"
              }`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
