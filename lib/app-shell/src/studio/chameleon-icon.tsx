import type { LucideProps } from "lucide-react";

/** Lucide Lab chameleon (ISC) — coiled lizard, not a painter's palette. */
export function ChameleonIcon({
  color = "currentColor",
  size = 24,
  strokeWidth = 2,
  absoluteStrokeWidth,
  className,
  ...rest
}: LucideProps) {
  const px = typeof size === "number" ? size : 24;
  const sw = absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(px) : strokeWidth;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      <path d="M11 22c-5 0-9-4.5-9-10S6 2 11 2c2.2 0 4.2.9 5.7 2.3L19.3 2c3.1 3.1 3.5 7.9 1.3 11.4-.6.9-1.9.9-2.7.1l-1.2-1.2C15.2 10.9 13.2 10 11 10a6 6 0 0 0 0 12 4 4 0 0 0 0-8 2 2 0 0 0 0 4m3-11h.01" />
      <circle cx="14.5" cy="7" r="3.5" />
      <path d="M8 10.8 6 10l1-2m15 14a2 2 0 0 1-2-2v-6.1" />
    </svg>
  );
}
