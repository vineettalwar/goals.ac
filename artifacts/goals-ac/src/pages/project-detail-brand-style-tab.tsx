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

export function ProjectDetailBrandStyleTab({ ctx }: { ctx: Record<string, unknown> }) {
  const {
    styleForm, isSavingStyle, saveStyleSuccess, onSaveContentStyle,
  } = ctx as never;

  return (
                <Card className="border-white/7 glass-card-md shadow-none">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Palette className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Content Style</CardTitle>
                        <CardDescription>
                          Fine-tune the writing persona, tone, and format
                          preferences for all AI-generated content in this project.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...styleForm}>
                      <form
                        onSubmit={styleForm.handleSubmit(onSaveContentStyle)}
                        className="space-y-6"
                      >
                        <FormField
                          control={styleForm.control}
                          name="tonePreset"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tone preset</FormLabel>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {TONE_PRESETS.map((preset) => (
                                  <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() =>
                                      field.onChange(
                                        field.value === preset.value
                                          ? undefined
                                          : preset.value,
                                      )
                                    }
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                                      field.value === preset.value
                                        ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-300"
                                        : "bg-muted/50 border-border text-foreground hover:border-primary/40 hover:bg-muted"
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <FormField
                          control={styleForm.control}
                          name="personaName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Writing persona</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder='e.g. "Alex, our Head of Growth" or "Dr. Sarah Chen, Chief Research Officer"'
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Give the AI writer a name and role to adopt when
                                generating content
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <FormField
                          control={styleForm.control}
                          name="defaultWordCount"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-2">
                                <FormLabel>Default word count</FormLabel>
                                <span className="text-sm font-semibold text-foreground">
                                  {field.value?.toLocaleString() ?? 800} words
                                </span>
                              </div>
                              <div className="flex gap-2 mb-3">
                                {WORD_COUNT_PRESETS.map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => field.onChange(preset.value)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                                      field.value === preset.value
                                        ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-300"
                                        : "bg-muted/50 border-border text-foreground hover:border-primary/40 hover:bg-muted"
                                    }`}
                                  >
                                    {preset.label} ({preset.value})
                                  </button>
                                ))}
                              </div>
                              <FormControl>
                                <Slider
                                  min={300}
                                  max={3000}
                                  step={100}
                                  value={[field.value ?? 800]}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  className="w-full"
                                />
                              </FormControl>
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>300</span>
                                <span>3,000</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField
                            control={styleForm.control}
                            name="primaryLanguage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary content language</FormLabel>
                                <Select
                                  value={field.value ?? "English"}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {LANGUAGES.map((lang) => (
                                      <SelectItem key={lang} value={lang}>
                                        {lang}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
    
                          <FormField
                            control={styleForm.control}
                            name="readingLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Audience reading level</FormLabel>
                                <Select
                                  value={field.value ?? "none"}
                                  onValueChange={(v) =>
                                    field.onChange(v === "none" ? undefined : v)
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select reading level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      Not specified
                                    </SelectItem>
                                    {READING_LEVELS.map((level) => (
                                      <SelectItem
                                        key={level.value}
                                        value={level.value}
                                      >
                                        {level.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
    
                        <FormField
                          control={styleForm.control}
                          name="forbiddenWords"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Forbidden words &amp; phrases</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="synergy, leverage, disruptive, game-changer, revolutionary"
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Comma-separated — the AI will avoid these in all
                                generated content
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
    
                        <div className="flex items-center gap-3">
                          <Button
                            type="submit"
                            disabled={isSavingStyle}
                            className="bg-linear-to-r from-blue-500 to-blue-600 border-0 text-white hover:from-blue-600 hover:to-blue-700"
                          >
                            {isSavingStyle ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save content style
                              </>
                            )}
                          </Button>
                          {saveStyleSuccess && (
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                              Saved successfully
                            </span>
                          )}
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
  );
}
