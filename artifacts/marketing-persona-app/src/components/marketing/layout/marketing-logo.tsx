import Link from "next/link";

type MarketingLogoProps = {
  className?: string;
  textClassName?: string;
  iconSize?: number;
};

export function MarketingLogo({
  className = "flex items-center gap-2.5",
  textClassName = "text-white text-2xl font-playfair italic",
  iconSize = 26,
}: MarketingLogoProps) {
  return (
    <Link href="/" className={className}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 256 256" fill="#ffffff" aria-hidden>
        <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
      </svg>
      <span className={textClassName}>goals.ac</span>
    </Link>
  );
}
