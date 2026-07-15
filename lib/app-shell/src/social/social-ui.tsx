import type { ReactNode } from "react";
import { Share2 } from "lucide-react";

export type SocialHubLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function SocialHubView({
  projectId,
  renderLink,
}: {
  projectId?: string | null;
  renderLink: (props: SocialHubLinkProps) => ReactNode;
}) {
  const studioHref = projectId ? `/studio?project=${projectId}` : "/studio";

  return (
    <div className="space-y-4">
      <div className="paper-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Social publishing</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Schedule and publish social variants from content pieces. Write APIs for queue management are
          rolling out on the edge worker.
        </p>
        <div className="mt-4">
          {renderLink({
            href: studioHref,
            className: "inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground",
            children: "Open content studio",
          })}
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        Voice presets, posting queue, and platform connections are available in the full product app at{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">localhost:3001</code> during local development.
      </div>
    </div>
  );
}
