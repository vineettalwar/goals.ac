import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import {
  Loader2, ExternalLink, Save, Globe, AlertCircle, RefreshCw, CheckCircle2, Palette,
} from "lucide-react";
import { PublishingSettingsPanel } from "@/components/publishing-settings-panel";
import { hasAnyPublishingConnection, countPublishingConnections } from "@/lib/publishing-destinations";
import { VoiceStringListField } from "./project-detail-voice-string-list-field";
import { ProjectDetailWritingExamples } from "./project-detail-writing-examples";
import {
  TONE_PRESETS, READING_LEVELS, LANGUAGES, WORD_COUNT_PRESETS,
  TIMEZONE_OPTIONS, RUN_HOUR_OPTIONS, API_BASE,
} from "./project-detail-constants";

export function ProjectDetailBrandProfileTab({ ctx }: { ctx: Record<string, unknown> }) {
  const {
    form, isSaving, saveSuccess, isScraping, wasAutoFilled, scrapeFailed, onRescan, onSaveBrandProfile,
    brandProfileUpdatedAt,
  } = ctx as never;

  return (
    <>
                  <Card className="border-white/7 glass-card-md shadow-none">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle>Brand Profile</CardTitle>
                          <CardDescription>
                            This information is used to personalize all AI-generated
                            content for your website.
                          </CardDescription>
                          {brandProfileUpdatedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last updated {brandProfileUpdatedAt}
                            </p>
                          )}
                        </div>
                        {!isScraping && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onRescan}
                            className="shrink-0 gap-1.5 text-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Re-scan website
                          </Button>
                        )}
                      </div>
      
                      {isScraping && (
                        <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-400/20 bg-blue-500/7 px-4 py-3">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-500 dark:text-blue-400">
                              Analyzing your website…
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Reading your homepage and key pages to pre-fill your
                              brand profile. This takes about 15–30 seconds.
                            </p>
                          </div>
                        </div>
                      )}
      
                      {wasAutoFilled && !isScraping && (
                        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/7 px-4 py-3">
                          <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <p className="text-sm text-emerald-600 dark:text-emerald-400">
                            Review each field, then save to confirm.
                          </p>
                        </div>
                      )}
      
                      {scrapeFailed && (
                        <div className="mt-3 flex items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/7 px-4 py-3">
                          <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-500 dark:text-red-400">
                              Website scan failed
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              We couldn't read your website. Fill in the fields
                              manually, or try re-scanning.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {isScraping ? (
                        <div className="space-y-6 animate-pulse">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="space-y-2">
                              <div className="h-4 w-28 rounded bg-muted" />
                              <div className="h-10 rounded bg-muted" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(onSaveBrandProfile)}
                            className="space-y-6"
                          >
                            <div className="grid gap-6 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name="companyName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Company name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Acme Corp" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="industry"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Industry</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="B2B SaaS, E-commerce, etc."
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name="targetAudience"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Target audience</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Describe your ideal customers — their role, company size, pain points, etc."
                                      className="resize-none"
                                      rows={3}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="voiceTone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Brand voice &amp; tone</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Professional yet approachable, data-driven, conversational..."
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="primaryKeywords"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Primary keywords</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="keyword one, keyword two, keyword three"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  <p className="text-xs text-muted-foreground">
                                    Comma-separated list of your main target keywords
                                  </p>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="competitorUrls"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Competitor URLs</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="https://rival.co"
                                      className="resize-none font-mono text-sm"
                                      rows={3}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  <p className="text-xs text-muted-foreground">
                                    One URL per line
                                  </p>
                                </FormItem>
                              )}
                            />
                            <div className="flex items-center gap-3">
                              <Button
                                type="submit"
                                disabled={isSaving}
                                className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save brand profile
                                  </>
                                )}
                              </Button>
                              {saveSuccess && (
                                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                  Saved successfully
                                </span>
                              )}
                            </div>
                          </form>
                        </Form>
                      )}
                    </CardContent>
                  </Card>
      
    </>
  );
}
