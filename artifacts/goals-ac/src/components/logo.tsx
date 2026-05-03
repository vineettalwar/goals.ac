interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  textClassName?: string;
}

export function LogoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="text-primary"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="10" cy="10" r="3.5" fill="currentColor" />
      <circle cx="15.5" cy="4.5" r="2" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 20, showWordmark = true, className = "", textClassName = "text-xl" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoIcon size={size} />
      {showWordmark && (
        <span className={`font-bold tracking-tight leading-none select-none ${textClassName}`}>
          <span className="text-foreground">goals</span>
          <span className="text-primary font-medium">.ac</span>
        </span>
      )}
    </span>
  );
}
