"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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

export function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    if (!res.ok) { toast.error("Failed to create project"); return; }
    const { project } = await res.json();
    setOpen(false);
    reset();
    toast.success("Project created — analyzing your website...");
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md paper-card p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">New project</Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" placeholder="My Company Blog" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">Website URL</Label>
              <Input id="url" placeholder="https://example.com" {...register("url")} />
              {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
              <p className="text-xs text-muted-foreground">We&apos;ll analyze this URL to extract your brand profile automatically.</p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? <><Spinner size="sm" className="border-white/30 border-t-white" /> Creating...</> : "Create project"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
