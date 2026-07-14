"use client";

import { Button } from "@/components/ui/button";

/** Paid checkout is disabled while only Starter (BYOK) is offered. */
export function UpgradePlanButton(_props: {
  plan?: never;
  label: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button variant="outline" className={_props.className} disabled>
      Not available
    </Button>
  );
}
