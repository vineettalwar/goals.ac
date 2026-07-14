import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ExternalLink } from "lucide-react";
import { CrawlStatusBadge } from "./dashboard-crawl-status-badge";

export interface WebsiteProject {
  id: number;
  name: string;
  url: string;
  sitemapUrl: string | null;
  pageCount: number;
  crawlStatus: string;
  createdAt: string;
}

export function DashboardProjectsGrid({
  projects,
  onDeleteRequest,
}: {
  projects: WebsiteProject[];
  onDeleteRequest: (id: number) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <Card key={project.id} className="group border shadow-none card-hover-glow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{project.url.replace(/^https?:\/\//, "")}</span>
                </a>
              </div>
              <CrawlStatusBadge status={project.crawlStatus} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {project.pageCount > 0 ? (
                  <span>{project.pageCount} pages found</span>
                ) : (
                  <span>Sitemap analysis pending</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-red-600 hover:bg-red-100 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                  onClick={() => onDeleteRequest(project.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button size="sm" asChild className="border bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/30">
                  <Link to={`/projects/${project.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
