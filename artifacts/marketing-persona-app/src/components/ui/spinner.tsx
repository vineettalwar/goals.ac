import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-border border-t-primary",
        sizes[size],
        className
      )}
    >
      <span className="sr-only">Loading</span>
    </span>
  );
}
