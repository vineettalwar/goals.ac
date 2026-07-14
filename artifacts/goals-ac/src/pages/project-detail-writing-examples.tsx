import { type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Plus, Trash2 } from "lucide-react";

function WritingExampleField({
  control,
  index,
}: {
  control: Control<{ writingExamples?: string[] }>;
  index: number;
}) {
  return (
    <FormField
      control={control}
      name={`writingExamples.${index}`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Textarea
              {...field}
              placeholder="Paste a writing sample here…"
              className="min-h-[120px] resize-y"
              rows={4}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ProjectDetailWritingExamples({
  control,
  writingExamples,
  maxExamples,
  onAppend,
  onRemove,
}: {
  control: Control<{ writingExamples?: string[] }>;
  writingExamples: string[];
  maxExamples: number;
  onAppend: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Writing Examples</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add 3–5 samples of your best writing so the AI can learn your style.
          </p>
        </div>
        {writingExamples.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {writingExamples.length}/{maxExamples}
          </Badge>
        )}
      </div>

      {writingExamples.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Paste blog posts, emails, or landing page copy you are proud of.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onAppend}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add first sample
          </Button>
        </div>
      ) : writingExamples.length === 1 ? (
        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sample 1</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onRemove(0)} aria-label="Remove sample 1">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <WritingExampleField control={control} index={0} />
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {writingExamples.map((sample, index) => {
            const preview = sample.trim()
              ? sample.trim().slice(0, 72) + (sample.trim().length > 72 ? "…" : "")
              : "Click to paste a writing sample…";
            return (
              <AccordionItem key={`writing-example-${sample.slice(0, 48)}-${sample.length}`} value={`writing-example-${index}`} className="rounded-lg border border-border/60 px-3 data-[state=open]:bg-muted/20">
                <div className="flex items-center gap-1">
                  <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                    <div className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                      <span className="text-xs font-medium text-muted-foreground">Sample {index + 1}</span>
                      <span className="text-sm font-normal text-foreground/80 line-clamp-1">{preview}</span>
                    </div>
                  </AccordionTrigger>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onRemove(index)} aria-label={`Remove sample ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <AccordionContent className="pb-3">
                  <WritingExampleField control={control} index={index} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {writingExamples.length > 0 && writingExamples.length < maxExamples && (
        <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={onAppend}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add another sample
        </Button>
      )}
    </div>
  );
}
