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
  Loader2, ExternalLink, Save, Globe, AlertCircle, RefreshCw, CheckCircle2, Palette, FileText, Plus, Trash2,
} from "lucide-react";
import { PublishingSettingsPanel } from "@/components/publishing-settings-panel";
import { hasAnyPublishingConnection, countPublishingConnections } from "@/lib/publishing-destinations";
import { VoiceStringListField } from "./project-detail-voice-string-list-field";
import { ProjectDetailWritingExamples } from "./project-detail-writing-examples";
import {
  TONE_PRESETS, READING_LEVELS, LANGUAGES, WORD_COUNT_PRESETS,
  TIMEZONE_OPTIONS, RUN_HOUR_OPTIONS, API_BASE,
} from "./project-detail-constants";

import type { ProjectDetailCtx } from "./use-project-detail";

export function ProjectDetailVoiceTab({ ctx }: { ctx: ProjectDetailCtx }) {
  const {
    voiceForm, isScraping, wasAutoFilled, scrapeFailed, onRescan, onSaveBrandVoice,
    writingExamples, brandGlossary, antiPatterns, doWords, dontWords, MAX_WRITING_EXAMPLES, MAX_VOICE_TERMS,
    onAnalyzeWritingExamples, appendWritingExample, removeWritingExample, appendVoiceListItem, removeVoiceListItem,
  } = ctx;

  return (
    <TabsContent value="voice">
                  <Card className="border-white/7 glass-card-md shadow-none">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle>Brand Voice</CardTitle>
                          <CardDescription>
                            Customize how our AI writes content to match your unique
                            brand voice and style.
                          </CardDescription>
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
                        <>
                          <Form {...voiceForm}>
                            <form
                              onSubmit={voiceForm.handleSubmit(onSaveBrandVoice)}
                              className="space-y-6"
                            >
                              <ProjectDetailWritingExamples
                                control={voiceForm.control}
                                writingExamples={writingExamples}
                                maxExamples={MAX_WRITING_EXAMPLES}
                                onAppend={appendWritingExample}
                                onRemove={removeWritingExample}
                              />
                              <Button
                                type="button"
                                onClick={onAnalyzeWritingExamples}
                                className="w-full text-sm font-medium border border-blue-500 hover:border-blue-600"
                              >
                                Analyze Examples
                              </Button>
                              <VoiceStringListField
                                label="Brand Glossary"
                                description="Words and phrases you commonly use in your content."
                                emptyDescription="Add product names, branded terms, or phrases your team uses consistently."
                                placeholder="Enter a term…"
                                addFirstLabel="Add first term"
                                addAnotherLabel="Add another term"
                                maxItems={MAX_VOICE_TERMS}
                                name="brandGlossary"
                                control={voiceForm.control}
                                values={brandGlossary}
                                onAppend={() =>
                                  appendVoiceListItem("brandGlossary", brandGlossary)
                                }
                                onRemove={(index) =>
                                  removeVoiceListItem(
                                    "brandGlossary",
                                    brandGlossary,
                                    index,
                                  )
                                }
                              />
                              <VoiceStringListField
                                label="Anti-patterns"
                                description="Words and phrases you never want to appear in your content."
                                emptyDescription="List clichés, buzzwords, or off-brand language to block."
                                placeholder="Enter a term to avoid…"
                                addFirstLabel="Add first term"
                                addAnotherLabel="Add another term"
                                maxItems={MAX_VOICE_TERMS}
                                name="antiPatterns"
                                control={voiceForm.control}
                                values={antiPatterns}
                                onAppend={() =>
                                  appendVoiceListItem("antiPatterns", antiPatterns)
                                }
                                onRemove={(index) =>
                                  removeVoiceListItem(
                                    "antiPatterns",
                                    antiPatterns,
                                    index,
                                  )
                                }
                              />
                              <div className="space-y-4">
                                <label htmlFor="typical-structure" className="text-sm font-medium mb-1">
                                  Typical Structure
                                </label>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Describe your typical content structure (e.g., "Hook
                                  → Problem → Solution → CTA").
                                </p>
                                <Input
                                  id="typical-structure"
                                  placeholder="Hook → Problem → Solution → CTA"
                                  value={voiceForm.getValues().typicalStructure}
                                  onChange={(e) =>
                                    voiceForm.setValue(
                                      "typicalStructure",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                              <VoiceStringListField
                                label="Preferred Words"
                                description="Words you like to use in your content."
                                emptyDescription="Add words that match your brand tone and voice."
                                placeholder="Enter a preferred word…"
                                addFirstLabel="Add first word"
                                addAnotherLabel="Add another word"
                                maxItems={MAX_VOICE_TERMS}
                                name="doWords"
                                control={voiceForm.control}
                                values={doWords}
                                onAppend={() =>
                                  appendVoiceListItem("doWords", doWords)
                                }
                                onRemove={(index) =>
                                  removeVoiceListItem("doWords", doWords, index)
                                }
                              />
                              <VoiceStringListField
                                label="Words to Avoid"
                                description="Words you don't want to use in your content."
                                emptyDescription="Add words that feel off-brand or you want the AI to skip."
                                placeholder="Enter a word to avoid…"
                                addFirstLabel="Add first word"
                                addAnotherLabel="Add another word"
                                maxItems={MAX_VOICE_TERMS}
                                name="dontWords"
                                control={voiceForm.control}
                                values={dontWords}
                                onAppend={() =>
                                  appendVoiceListItem("dontWords", dontWords)
                                }
                                onRemove={(index) =>
                                  removeVoiceListItem("dontWords", dontWords, index)
                                }
                              />
                            </form>
                          </Form>
                        </>
                      )}
                    </CardContent>
                  </Card>
    </TabsContent>
  );
}
