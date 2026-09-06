import Link from "next/link";
import { GoalsBrandMark } from "@workspace/app-shell/brand-mark";

type MarketingLogoProps = {
  className?: string;
  textClassName?: string;
  iconSize?: number;
};

export function MarketingLogo({
  className = "flex items-center gap-2.5 text-white",
  textClassName = "text-2xl font-playfair italic",
  iconSize = 26,
}: MarketingLogoProps) {
  return (
    <Link href="/" className={className}>
      <GoalsBrandMark size={iconSize} />
      <span className={textClassName}>goals.ac</span>
    </Link>
  );
}
