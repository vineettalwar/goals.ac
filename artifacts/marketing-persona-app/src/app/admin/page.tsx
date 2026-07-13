import Link from "next/link";
import { Building2, ChevronRight, FileText, FolderKanban } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

const ADMIN_SECTIONS = [
  {
    href: "/admin/organizations",
    title: "Organizations",
    description: "Onboard new customers, assign owners, and view all orgs.",
    icon: Building2,
  },
  {
    href: "/admin/content-strategies",
    title: "Content Strategies",
    description: "Browse and prepare AI-generated content plans across all users.",
    icon: FileText,
  },
  {
    href: "/projects",
    title: "Projects",
    description: "View and manage all website projects on the platform.",
    icon: FolderKanban,
  },
] as const;

export default async function AdminPage() {
  await requirePlatformAdmin();

  return (
    <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform administration tools</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </div>

      <div className="grid gap-3">
        {ADMIN_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="paper-card flex items-center gap-4 p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <section.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-medium">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
