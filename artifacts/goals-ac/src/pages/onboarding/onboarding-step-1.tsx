import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Globe, CheckCircle2, ArrowRight, Map, FileText, ChevronRight } from "lucide-react";

import type { OnboardingStepProps } from "./onboarding-step-props";

export function OnboardingStep1(props: OnboardingStepProps) {
  const { step1Form, onStep1Submit } = props;

  return (
<div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight mb-2">Add your website</h1>
                <p className="text-muted-foreground">We'll scan your site and auto-fill your brand profile so you don't have to.</p>
              </div>
              <Form {...step1Form}>
                <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-5">
                  {step1Form.formState.errors.root && (
                    <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500 border border-red-200 dark:border-red-500/20">
                      {step1Form.formState.errors.root.message}
                    </div>
                  )}
                  <FormField
                    control={step1Form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company / project name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={step1Form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-linear-to-r from-blue-500 to-blue-600 border-0 text-white gap-2"
                    disabled={step1Form.formState.isSubmitting}
                  >
                    {step1Form.formState.isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                    ) : (
                      <>Get started <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
  );
}
