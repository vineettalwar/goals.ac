"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/components/new-project-dialog";

export function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New project
      </Button>
      <NewProjectDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(project) => {
          router.push(`/projects/${project.id}`);
          router.refresh();
        }}
      />
    </>
  );
}
