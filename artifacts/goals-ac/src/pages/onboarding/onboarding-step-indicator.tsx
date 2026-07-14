import { Check } from "lucide-react";

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
            ${i + 1 < current ? "bg-blue-600 text-white" : i + 1 === current ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-500/20" : "bg-muted text-muted-foreground"}`}
          >
            {i + 1 < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 rounded ${i + 1 < current ? "bg-blue-600" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
