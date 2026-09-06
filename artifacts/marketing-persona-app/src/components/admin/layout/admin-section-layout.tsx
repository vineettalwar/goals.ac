import type { ReactNode } from "react";
import {
  APP_SHELL_PAGE,
  APP_SHELL_PAGE_WIDE,
} from "@workspace/app-shell/shell-constants";
import { AdminSubnav, type AdminSubnavItem } from "@/components/admin/layout/admin-subnav";

interface AdminSectionLayoutProps {
  title: string;
  description: string;
  tabs?: AdminSubnavItem[];
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

export function AdminSectionLayout({
  title,
  description,
  tabs,
  actions,
  children,
  wide = false,
}: AdminSectionLayoutProps) {
  return (
    <div className={`space-y-6 ${wide ? APP_SHELL_PAGE_WIDE : APP_SHELL_PAGE}`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions}
      </header>

      {tabs && tabs.length > 0 ? <AdminSubnav items={tabs} /> : null}

      <div>{children}</div>
    </div>
  );
}
