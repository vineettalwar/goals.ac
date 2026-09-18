import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 paper-interactive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 paper-card-enhanced",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 paper-card-enhanced",
        outline:
          "border border-border bg-card hover:bg-secondary text-foreground paper-card-enhanced",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 paper-card-enhanced",
        ghost: "hover:bg-secondary text-foreground paper-card-enhanced",
        link: "text-primary underline-offset-4 hover:underline paper-card-enhanced",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-11 rounded-sm px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
