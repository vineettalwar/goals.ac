"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const schema = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Enter a valid URL"),
});
type FormData = z.infer<typeof schema>;

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (project: { id: number }) => void;
}

export function NewProjectDialog({ open, onOpenChange, onCreated }: NewProjectDialogProps) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    const res = await fetch("/api/website-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        (body as { message?: string }).message ??
        (body as { error?: string }).error ??
        "Failed to create project";
      toast.error(message);
      return;
    }
    const project = await res.json();
    if (!project?.id) {
      toast.error("Failed to create project");
      return;
    }
    onOpenChange(false);
    reset();
    toast.success("Project created — analyzing your website…");
    onCreated?.(project);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md paper-card p-6 shadow-lg overscroll-contain">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">New project</Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground" aria-label="Close dialog">
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-project-name">Project name</Label>
              <Input id="new-project-name" autoComplete="organization" placeholder="My Company Blog" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-project-url">Website URL</Label>
              <Input id="new-project-url" type="url" autoComplete="url" placeholder="https://example.com" {...register("url")} />
              {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
              <p className="text-xs text-muted-foreground">
                We&apos;ll analyze this URL to extract your brand profile automatically.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="border-white/30 border-t-white" /> Creating…
                  </>
                ) : (
                  "Create project"
                )}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
