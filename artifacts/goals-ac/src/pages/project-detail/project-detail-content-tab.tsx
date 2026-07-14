import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { FileText, BarChart3, Search, Map } from "lucide-react";

import type { ProjectDetailCtx } from "./use-project-detail";

export function ProjectDetailContentTab({ ctx }: { ctx: ProjectDetailCtx }) {
  const { content } = ctx;

  return (
    <TabsContent value="content">
                  <div className="space-y-6">
                    {content && content.seoArticles.length > 0 && (
                      <Card className="border-white/7 glass-card-md shadow-none">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            SEO Articles
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="divide-y divide-border">
                            {content.seoArticles.map((article) => (
                              <div
                                key={article.id}
                                className="py-3 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {article.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {article.primaryKeyword} · {article.wordCount}{" "}
                                    words
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                  className="hover:bg-muted dark:hover:bg-white/7"
                                >
                                  <Link to={`/seo-article/${article.id}`}>View</Link>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
      
                    {content && content.contentStrategies.length > 0 && (
                      <Card className="border-white/7 glass-card-md shadow-none">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            Content Strategies
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="divide-y divide-border">
                            {content.contentStrategies.map((strategy) => (
                              <div
                                key={strategy.id}
                                className="py-3 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-sm">
                                    {strategy.industry} · {strategy.location}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {strategy.stage}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                  className="hover:bg-muted dark:hover:bg-white/7"
                                >
                                  <Link to={`/content-strategy/${strategy.id}`}>
                                    View
                                  </Link>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
      
                    {content && content.geoAudits.length > 0 && (
                      <Card className="border-white/7 glass-card-md shadow-none">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Search className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                            GEO Audits
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="divide-y divide-border">
                            {content.geoAudits.map((audit) => (
                              <div
                                key={audit.id}
                                className="py-3 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {audit.url.replace(/^https?:\/\//, "")}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    GEO Score:{" "}
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                      {audit.geoScore}/100
                                    </span>
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                  className="hover:bg-muted dark:hover:bg-white/7"
                                >
                                  <Link to={`/geo-audit/${audit.id}`}>View</Link>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
      
                    {content && content.roadmaps && content.roadmaps.length > 0 && (
                      <Card className="border-white/7 glass-card-md shadow-none">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Growth Roadmaps
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="divide-y divide-border">
                            {content.roadmaps.map((roadmap) => (
                              <div
                                key={roadmap.id}
                                className="py-3 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-sm">
                                    {roadmap.industry} · {roadmap.location}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                    {roadmap.stage} stage
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                  className="hover:bg-muted dark:hover:bg-white/7"
                                >
                                  <Link to={`/roadmap/${roadmap.slug}`}>View</Link>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
      
                    {content &&
                      content.contentStrategies.length === 0 &&
                      content.seoArticles.length === 0 &&
                      content.geoAudits.length === 0 &&
                      (!content.roadmaps || content.roadmaps.length === 0) && (
                        <Card className="border-white/7 glass-card border-dashed">
                          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full glass-card-md flex items-center justify-center mb-4">
                              <FileText className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                            </div>
                            <CardTitle className="text-lg mb-2">
                              No content yet
                            </CardTitle>
                            <CardDescription className="max-w-sm mb-6">
                              Use the tools on the home page to generate roadmaps,
                              content strategies, SEO articles, and GEO audits.
                              They'll appear here when you're logged in.
                            </CardDescription>
                            <Button
                              className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                              asChild
                            >
                              <Link to="/">Generate content</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                  </div>
    </TabsContent>
  );
}
