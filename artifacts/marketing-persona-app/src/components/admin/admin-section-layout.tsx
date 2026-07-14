import type { ReactNode } from "react";
import { AdminSubnav, type AdminSubnavItem } from "@/components/admin/admin-subnav";

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
    <div className={`space-y-6 px-8 py-8 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
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
