import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, BarChart3, RefreshCw, ArrowUpDown, ExternalLink, Trash2, ArrowRight } from "lucide-react";
import { type HubItem, type LegacyItem, type ContentPiece, isContentPiece, FORMAT_META } from "./content-studio-types";
import { FormatBadge, StatusBadge } from "./content-studio-format-badge";

export type SortKey = "newest" | "oldest" | "words_desc" | "words_asc" | "title_asc";

export function ContentStudioHubTab({
  sorted,
  allItems,
  statsBreakdown,
  filterSource,
  setFilterSource,
  filterFormat,
  setFilterFormat,
  filterStatus,
  setFilterStatus,
  sortKey,
  setSortKey,
  studioSorted,
  legacySorted,
  onCreateOpen,
  onMarkReady,
  onDelete,
}: {
  sorted: HubItem[];
  allItems: HubItem[];
  statsBreakdown: Array<{ label: string; count: number; color: string }>;
  filterSource: string;
  setFilterSource: (v: string) => void;
  filterFormat: string;
  setFilterFormat: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;
  studioSorted: ContentPiece[];
  legacySorted: LegacyItem[];
  onCreateOpen: () => void;
  onMarkReady: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
              <TabsContent value="hub">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <Select value={filterSource} onValueChange={setFilterSource}>
                    <SelectTrigger className="w-32 h-8 text-xs border-dashed">
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="seo_article">SEO Articles</SelectItem>
                      <SelectItem value="content_strategy">
                        Strategy Items
                      </SelectItem>
                      <SelectItem value="geo_audit">GEO Audits</SelectItem>
                      <SelectItem value="roadmap">Roadmaps</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterFormat} onValueChange={setFilterFormat}>
                    <SelectTrigger className="w-36 h-8 text-xs border-dashed">
                      <SelectValue placeholder="All formats" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All formats</SelectItem>
                      {Object.entries(FORMAT_META).map(([type, meta]) => (
                        <SelectItem key={type} value={type}>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 h-8 text-xs border-dashed">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
    
                  <div className="w-px h-5 bg-border mx-1" />
    
                  <Select
                    value={sortKey}
                    onValueChange={(v) => setSortKey(v as SortKey)}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs border-dashed">
                      <ArrowUpDown className="w-3 h-3 mr-1.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="words_desc">Most words</SelectItem>
                      <SelectItem value="words_asc">Fewest words</SelectItem>
                      <SelectItem value="title_asc">A → Z</SelectItem>
                    </SelectContent>
                  </Select>
    
                  {(filterFormat !== "all" ||
                    filterStatus !== "all" ||
                    filterSource !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={() => {
                        setFilterFormat("all");
                        setFilterStatus("all");
                        setFilterSource("all");
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>
    
                {statsBreakdown.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4 px-1 text-xs text-muted-foreground">
                    <span>{allItems.length} total</span>
                    {statsBreakdown.map((s) => (
                      <span key={s.label} className="flex items-center gap-1.5">
                        <span className="w-px h-3 bg-border" />
                        <span className={`font-medium ${s.color}`}>{s.count}</span>
                        <span>{s.label}</span>
                      </span>
                    ))}
                  </div>
                )}
    
                {sorted.length === 0 && allItems.length === 0 ? (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <BarChart3 className="w-7 h-7 text-primary" />
                      </div>
                      <CardTitle className="text-xl mb-2">
                        Your Content Studio is empty
                      </CardTitle>
                      <CardDescription className="max-w-sm mb-6">
                        Start generating AI-powered content tailored to your brand —
                        blog posts, guides, whitepapers, and more.
                      </CardDescription>
                      <Button onClick={onCreateOpen}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create your first piece
                      </Button>
                    </CardContent>
                  </Card>
                ) : sorted.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No content matches your current filters.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden md:grid md:grid-cols-[1fr_160px_110px_auto_70px_80px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                      <span>Title</span>
                      <span>Format</span>
                      <span>Keyword</span>
                      <span>Status</span>
                      <span>Words</span>
                      <span>Date</span>
                    </div>
    
                    {filterSource === "all" &&
                    studioSorted.length > 0 &&
                    legacySorted.length > 0 ? (
                      <>
                        {studioSorted.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 pt-1 pb-0.5">
                              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                                Studio Content
                              </span>
                              <div className="flex-1 h-px bg-border/50" />
                              <span className="text-xs text-muted-foreground">
                                {studioSorted.length}
                              </span>
                            </div>
                            {studioSorted.map((item) => (
                              <div
                                key={`studio-${item.id}`}
                                className="group flex flex-col md:grid md:grid-cols-[1fr_160px_110px_auto_70px_80px] gap-3 items-start md:items-center px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all"
                              >
                                <div className="min-w-0">
                                  <Link
                                    to={`/content-piece/${item.id}`}
                                    className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                                  >
                                    {item.title}
                                  </Link>
                                </div>
                                <FormatBadge type={item.formatType} />
                                <span className="text-xs text-muted-foreground truncate">
                                  {item.targetKeyword}
                                </span>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={item.status} />
                                  {item.status === "draft" && (
                                    <button type="button"
                                      onClick={() => onMarkReady(item.id)}
                                      title="Mark as ready"
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                      Ready
                                    </button>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {item.wordCount > 0
                                    ? item.wordCount.toLocaleString()
                                    : "—"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {format(parseISO(item.createdAt), "d MMM yyyy")}
                                  </span>
                                  <button type="button"
                                    onClick={() => onDelete(item.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                        {legacySorted.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 pt-3 pb-0.5">
                              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                                Legacy Content
                              </span>
                              <div className="flex-1 h-px bg-border/50" />
                              <span className="text-xs text-muted-foreground">
                                {legacySorted.length}
                              </span>
                            </div>
                            {legacySorted.map((item) => (
                              <div
                                key={`${item.source}-${item.id}`}
                                className="flex flex-col md:grid md:grid-cols-[1fr_160px_110px_auto_70px_80px] gap-3 items-start md:items-center px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all"
                              >
                                <div className="min-w-0">
                                  <Link
                                    to={item.linkTo}
                                    className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 flex items-center gap-1"
                                  >
                                    {item.title}
                                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                                  </Link>
                                  {item.subtitle && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                      {item.subtitle}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {item.keyword}
                                </span>
                                <StatusBadge status={item.status} />
                                <span className="text-xs text-muted-foreground">
                                  {item.wordCount > 0
                                    ? item.wordCount.toLocaleString()
                                    : "—"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(item.createdAt), "d MMM yyyy")}
                                </span>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    ) : (
                      sorted.map((item) => {
                        if (isContentPiece(item)) {
                          return (
                            <div
                              key={`studio-${item.id}`}
                              className="group flex flex-col md:grid md:grid-cols-[1fr_160px_110px_auto_70px_80px] gap-3 items-start md:items-center px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all"
                            >
                              <div className="min-w-0">
                                <Link
                                  to={`/content-piece/${item.id}`}
                                  className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                                >
                                  {item.title}
                                </Link>
                              </div>
                              <FormatBadge type={item.formatType} />
                              <span className="text-xs text-muted-foreground truncate">
                                {item.targetKeyword}
                              </span>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={item.status} />
                                {item.status === "draft" && (
                                  <button type="button"
                                    onClick={() => onMarkReady(item.id)}
                                    title="Mark as ready"
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                    Ready
                                  </button>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {item.wordCount > 0
                                  ? item.wordCount.toLocaleString()
                                  : "—"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(item.createdAt), "d MMM yyyy")}
                                </span>
                                <button type="button"
                                  onClick={() => onDelete(item.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={`${item.source}-${item.id}`}
                              className="flex flex-col md:grid md:grid-cols-[1fr_160px_110px_auto_70px_80px] gap-3 items-start md:items-center px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/30 transition-all"
                            >
                              <div className="min-w-0">
                                <Link
                                  to={item.linkTo}
                                  className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 flex items-center gap-1"
                                >
                                  {item.title}
                                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                                </Link>
                                {item.subtitle && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {item.keyword}
                              </span>
                              <StatusBadge status={item.status} />
                              <span className="text-xs text-muted-foreground">
                                {item.wordCount > 0
                                  ? item.wordCount.toLocaleString()
                                  : "—"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(item.createdAt), "d MMM yyyy")}
                              </span>
                            </div>
                          );
                        }
                      })
                    )}
                  </div>
                )}
              </TabsContent>
  );
}
