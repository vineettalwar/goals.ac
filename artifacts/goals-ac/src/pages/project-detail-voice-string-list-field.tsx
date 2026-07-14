import { type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useStableRowKeys } from "@/hooks/use-stable-row-keys";
import { Badge } from "@/components/ui/badge";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

type VoiceStringListName = "brandGlossary" | "antiPatterns" | "doWords" | "dontWords";

type BrandVoiceForm = {
  writingExamples?: string[];
  brandGlossary?: string[];
  antiPatterns?: string[];
  typicalStructure?: string;
  doWords?: string[];
  dontWords?: string[];
};

export function VoiceStringListField({
  label,
  description,
  emptyDescription,
  placeholder,
  addFirstLabel,
  addAnotherLabel,
  maxItems,
  name,
  control,
  values,
  onAppend,
  onRemove,
}: {
  label: string;
  description: string;
  emptyDescription: string;
  placeholder: string;
  addFirstLabel: string;
  addAnotherLabel: string;
  maxItems: number;
  name: VoiceStringListName;
  control: Control<BrandVoiceForm>;
  values: string[];
  onAppend: () => void;
  onRemove: (index: number) => void;
}) {
  const rowKeys = useStableRowKeys(values.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {values.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {values.length}/{maxItems}
          </Badge>
        )}
      </div>

      {values.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground mb-3 max-w-sm mx-auto">
            {emptyDescription}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onAppend}>
            <Plus className="w-4 h-4 mr-1.5" />
            {addFirstLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {values.map((_, index) => (
            <div key={rowKeys[index]} className="flex items-center gap-2">
              <FormField
                control={control}
                name={`${name}.${index}`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} placeholder={placeholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {values.length > 0 && values.length < maxItems && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={onAppend}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {addAnotherLabel}
        </Button>
      )}
    </div>
  );
}
