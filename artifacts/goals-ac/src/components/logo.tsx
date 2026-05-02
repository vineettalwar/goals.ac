interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6"/>
          <stop offset="100%" stopColor="#1E40AF"/>
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx="40" fill="url(#logo-bg)"/>
      <rect x="28" y="104" width="32" height="48" rx="7" fill="white" fillOpacity="0.75"/>
      <rect x="74" y="72" width="32" height="80" rx="7" fill="white" fillOpacity="0.88"/>
      <rect x="120" y="36" width="32" height="116" rx="7" fill="white"/>
      <polyline points="44,97 90,65 136,30" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45"/>
      <circle cx="136" cy="30" r="7" fill="white"/>
    </svg>
  );
}

export function Logo({ size = 28, showWordmark = true, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoIcon size={size} />
      {showWordmark && (
        <span className="font-bold text-xl tracking-tight leading-none">
          <span className="text-gray-900 dark:text-white">goals</span>
          <span className="text-blue-400">.ac</span>
        </span>
      )}
    </span>
  );
}
