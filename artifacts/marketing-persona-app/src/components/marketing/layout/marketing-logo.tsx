import { GoalsBrandMark } from "@workspace/app-shell/brand-mark";

type MarketingLogoProps = {
  className?: string;
  textClassName?: string;
  iconSize?: number;
};

/** Hard nav to `/` — soft-nav can sit on Next "Rendering…" while turbopack is busy. */
export function MarketingLogo({
  className = "flex items-center gap-2.5 text-white",
  textClassName = "text-2xl font-playfair italic",
  iconSize = 26,
}: MarketingLogoProps) {
  return (
    <a href="/" className={className}>
      <GoalsBrandMark size={iconSize} />
      <span className={textClassName}>goals.ac</span>
    </a>
  );
}
