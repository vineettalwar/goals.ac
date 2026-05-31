import { auth } from "@/auth";
import { db } from "@workspace/db";
import {
  companiesTable,
  scheduledArticlesTable,
  marketingPersonasTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import Link from "next/link";
import { Zap, FileText, Users, FolderOpen, ArrowRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  ready: "success",
  published: "default",
  generating: "warning",
  pending: "muted",
  failed: "destructive",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;
  const userId = parseInt(session.user.id, 10);

  const [companies, projects] = await Promise.all([
    db.select().from(companiesTable).where(eq(companiesTable.userId, userId)),
    db.select().from(websiteProjectsTable).where(eq(websiteProjectsTable.userId, userId)),
  ]);

  const company = companies[0];

  // Fetch autopilot stats
  let personaCount = 0;
  let recentArticles: (typeof scheduledArticlesTable.$inferSelect)[] = [];

  if (company) {
    const [{ value: pCount }] = await db
      .select({ value: count() })
      .from(marketingPersonasTable)
      .where(eq(marketingPersonasTable.companyId, company.id));
    personaCount = pCount;

    recentArticles = await db
      .select()
      .from(scheduledArticlesTable)
      .where(eq(scheduledArticlesTable.companyId, company.id))
      .orderBy(desc(scheduledArticlesTable.createdAt))
      .limit(5);
  }

  const readyCount = recentArticles.filter((a) => a.status === "ready").length;
  const publishedCount = recentArticles.filter((a) => a.status === "published").length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{greeting}, {session.user.name?.split(" ")[0]}</h1>
        {company && (
          <p className="mt-1 text-muted-foreground">{company.name} · Content Autopilot</p>
        )}
      </div>

      {/* Stat cards */}
      {company ? (
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="paper-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ready to publish</p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-bold">{readyCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">articles awaiting review</p>
          </div>
          <div className="paper-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published</p>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-bold">{publishedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">articles live</p>
          </div>
          <div className="paper-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personas</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-bold">{personaCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">audience profiles active</p>
          </div>
        </div>
      ) : (
        <div className="mb-8 paper-card p-6 flex items-center justify-between">
          <div>
            <p className="font-medium">Set up your autopilot</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Add your company to start generating SEO articles automatically.</p>
          </div>
          <Button asChild>
            <Link href="/onboarding"><Plus className="h-4 w-4 mr-1.5" /> Get started</Link>
          </Button>
        </div>
      )}

      {/* Recent articles */}
      {recentArticles.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent articles</h2>
            <Link href="/autopilot/articles" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="paper-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Keyword</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Words</th>
                </tr>
              </thead>
              <tbody>
                {recentArticles.map((article, i) => (
                  <tr key={article.id} className={i < recentArticles.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-4 py-3">
                      <Link href={`/autopilot/articles/${article.id}`} className="hover:underline font-medium line-clamp-1">
                        {article.title ?? "Untitled"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{article.primaryKeyword ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[article.status] ?? "muted"} className="capitalize">
                        {article.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{article.wordCount > 0 ? article.wordCount.toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Website projects</h2>
          <Link href="/projects" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="paper-card p-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">No projects yet. Create one to use the content studio and roadmaps.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects"><Plus className="h-3.5 w-3.5 mr-1.5" /> New project</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projects.slice(0, 4).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="paper-card p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{project.url}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
