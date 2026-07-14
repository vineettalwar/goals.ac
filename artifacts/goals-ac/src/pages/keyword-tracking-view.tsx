import { AppLayout } from "@/components/app-layout";
export function KeywordTrackingView(props: Record<string, unknown>) {
  const p = props as never;
    return (
    <LazyMotion features={domAnimation} strict>
    <AppLayout>
      <SEO
        title="Keyword Rank Tracking | goals.ac"
        description="Track SERP positions for target keywords and get AI-powered difficulty and visibility analysis."
      />

      <div className="relative bg-mesh-dark text-zinc-50 py-16 md:py-20 border-b border-white/6 overflow-hidden">
        <div className="orb orb-primary w-[400px] h-[300px] top-[-10%] right-[20%]" />
        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-3xl text-center">
          <m.div {...fadeUp(0)}>
            <div className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/8 px-3 py-1 text-xs font-semibold text-blue-300 mb-5">
              <BarChart3 className="w-3 h-3 mr-1.5" /> KEYWORD INTELLIGENCE
            </div>
          </m.div>
          <m.h1 {...fadeUp(0.07)} className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Keyword Tracking
          </m.h1>
          <m.p {...fadeUp(0.13)} className="text-lg text-zinc-400 max-w-xl mx-auto">
            Analyze keyword opportunities with AI, then track real Google rankings over time for your project.
          </m.p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl space-y-10">
        {!user && (
          <m.div {...fadeUp(0)} className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-3 flex items-center gap-3">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <Link to="/signup" className="font-semibold underline underline-offset-2">Sign up free</Link> to save analyses and track keyword rankings on your project.
            </p>
          </m.div>
        )}

        {user && activeProject && (
          <m.div {...fadeUp(0)} className="rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-semibold text-foreground">{activeProject.name}</span>
            </p>
          </m.div>
        )}

        {user && activeProjectId && (
          <m.div {...fadeUp(0.05)} className="space-y-4">
            <h2 className="text-lg font-semibold">Rank Tracking</h2>
            <Card className="shadow-none">
              <CardContent className="pt-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Keyword to track in Google"
                    value={trackInput}
                    onChange={(e) => setTrackInput(e.target.value)}
                    disabled={trackMutation.isPending}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleTrackKeyword(trackInput)}
                    disabled={!trackInput.trim() || trackMutation.isPending}
                  >
                    {trackMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {trackedQuery.isLoading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading tracked keywords…
                  </p>
                )}

                {trackedKeywords.length === 0 && !trackedQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">
                    No tracked keywords yet. Add one above or track from analysis results below.
                  </p>
                )}

                <div className="space-y-2">
                  {trackedKeywords.map((tk) => (
                    <button
                      type="button"
                      key={tk.id}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors text-left ${
                        selectedTrackedId === tk.id ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/5" : "border-border"
                      }`}
                      onClick={() => setSelectedTrackedId(tk.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{tk.keyword}</p>
                        <p className="text-xs text-muted-foreground">
                          {tk.latestSnapshot?.position != null
                            ? `Position #${tk.latestSnapshot.position}`
                            : "Not ranked in top 100"}
                          {tk.lastCheckedAt && ` · Last checked ${new Date(tk.lastCheckedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate({ id: tk.id });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </button>
                  ))}
                </div>

                {selectedTrackedId && chartData.length > 0 && (
                  <div className="h-48 mt-4">
                    <KeywordRankChart data={chartData} />
                  </div>
                )}
              </CardContent>
            </Card>
          </m.div>
        )}

        {user && activeProjectId && alerts.length > 0 && (
          <m.div {...fadeUp(0.05)} className="mb-8 space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
                  alert.severity === "critical"
                    ? "border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30"
                    : "border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{alert.message}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDismissAlert(alert.id)}>
                  Dismiss
                </Button>
              </div>
            ))}
          </m.div>
        )}

        {user && activeProjectId && (
          <m.div {...fadeUp(0.08)} className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                Keyword Opportunities
              </h2>
              <Button variant="outline" size="sm" onClick={handleDiscoverGaps} disabled={isDiscovering}>
                {isDiscovering ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ListPlus className="w-4 h-4 mr-2" />
                )}
                Discover gaps
              </Button>
            </div>
            <Card className="shadow-none">
              <CardContent className="pt-4 space-y-3">
                {opportunities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Run competitor analysis and keyword research, then click Discover gaps to find topics to queue into your content strategy.
                  </p>
                ) : (
                  opportunities.map((opp) => (
                    <div key={opp.id} className="rounded-lg border px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{opp.keyword}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opp.suggestedTitle}</p>
                        </div>
                        <Badge className="shrink-0">{opp.opportunityScore} score</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{opp.suggestedAngle}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {opp.difficulty && (
                          <Badge variant="outline" className={`text-xs capitalize ${difficultyColors[opp.difficulty] ?? ""}`}>
                            {opp.difficulty}
                          </Badge>
                        )}
                        {opp.estimatedVolume && (
                          <span className="text-xs text-muted-foreground">{opp.estimatedVolume}</span>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">{opp.source.replace("_", " ")}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleQueueOpportunity(opp.id)}
                          disabled={queueingId === opp.id}
                        >
                          {queueingId === opp.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : null}
                          Queue to strategy
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDismissOpportunity(opp.id)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </m.div>
        )}

        <m.div {...fadeUp(0.1)}>
          <h2 className="text-lg font-semibold mb-4">AI Keyword Analysis</h2>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Analyze Keywords</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. B2B SaaS growth strategy"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={analyzeMutation.isPending || keywords.length >= 10}
                />
                <Button
                  variant="outline"
                  onClick={addKeyword}
                  disabled={!inputVal.trim() || keywords.length >= 10}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1.5 pr-1.5 text-sm">
                      {kw}
                      <button type="button" onClick={() => removeKeyword(kw)} aria-label={`Remove ${kw}`} className="hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <label htmlFor="keyword-tracking-website-url" className="text-sm font-medium mb-1.5 block">Your Website URL (optional)</label>
                <Input
                  id="keyword-tracking-website-url"
                  placeholder="https://yourstartup.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={analyzeMutation.isPending}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                className="w-full glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || keywords.length === 0}
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing keywords…</>
                ) : (
                  <><TrendingUp className="w-4 h-4 mr-2" />Analyze Keywords</>
                )}
              </Button>
            </CardContent>
          </Card>
        </m.div>

        <AnimatePresence>
          {result && (
            <m.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="space-y-5"
            >
              <Card className="shadow-none border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Top Opportunity
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">{result.topOpportunity}</p>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground">{result.summary}</p>

              <div className="space-y-4">
                {result.keywords.map((kw, i) => (
                  <Card key={i} className="shadow-none">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-sm">{kw.keyword}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Est. monthly searches: {kw.estimatedVolume}</p>
                        </div>
                        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                          <Badge className={`text-xs capitalize ${difficultyColors[kw.difficulty]}`}>
                            {kw.difficulty} difficulty
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            AI visibility: {kw.aiVisibility}%
                          </Badge>
                          {user && activeProjectId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleTrackKeyword(kw.keyword)}
                              disabled={trackMutation.isPending}
                            >
                              Track rank
                            </Button>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-1 mb-3">
                        {kw.opportunities.map((op, j) => (
                          <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0 mt-2" />{op}
                          </li>
                        ))}
                      </ul>
                      <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Suggested content:</span> {kw.suggestedContent}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
    </LazyMotion>
  );
}
}
