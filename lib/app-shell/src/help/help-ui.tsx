import type { ReactNode } from "react";
import { BookOpen, CheckCircle2, Circle, ExternalLink } from "lucide-react";

export type HelpLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type HelpChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export type HelpResourceLink = {
  label: string;
  href: string;
  description?: string;
};

export function HelpView({
  advancedAppHref,
  checklist,
  resourceLinks,
  renderLink,
}: {
  advancedAppHref: string;
  checklist: HelpChecklistItem[];
  resourceLinks: HelpResourceLink[];
  renderLink: (props: HelpLinkProps) => ReactNode;
}) {
  const doneCount = checklist.filter((item) => item.done).length;

  return (
    <div className="space-y-6">
      <div className="paper-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Help center</h2>
        </div>
        <div className="space-y-3">
          {resourceLinks.map((link) => (
            <div key={link.href} className="rounded-lg border border-border px-4 py-3">
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {link.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {link.description ? (
                <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="paper-card p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Setup checklist</h2>
          <span className="text-xs text-muted-foreground">
            {doneCount}/{checklist.length} complete
          </span>
        </div>
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                {item.href ? (
                  renderLink({
                    href: item.href,
                    className: "text-sm font-medium hover:underline",
                    children: item.label,
                  })
                ) : (
                  <p className="text-sm font-medium">{item.label}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="paper-card p-6 text-sm text-muted-foreground">
        <p>
          Advanced workflows — CMS publishing, AI provider keys, admin tools, and social scheduling — are
          available in the full product app.
        </p>
        <a
          href={advancedAppHref}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Open full product app
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
