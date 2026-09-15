import type { ReactNode } from "react";
import { StatusBadge } from "./badges";

export function CopyDeskBar({
  status,
  score,
  approveSlot,
}: {
  status: string;
  score: number | null;
  approveSlot?: ReactNode;
}) {
  return (
    <div className="copy-desk-bar" role="region" aria-label="Copy desk">
      <StatusBadge status={status} />
      <span className="text-muted-foreground">
        Score{" "}
        {score == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="score-signal">{score}</span>
        )}
      </span>
      {approveSlot ? <span className="ml-auto">{approveSlot}</span> : null}
    </div>
  );
}
