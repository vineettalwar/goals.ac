import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCaptureLeadForRoadmap } from "@workspace/api-client-react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  companyUrl: z.string().url("Must be a valid URL (e.g., https://example.com)"),
});

type FormValues = z.infer<typeof formSchema>;

interface LeadCaptureModalProps {
  roadmapSlug: string;
  trigger?: React.ReactNode;
}

export function LeadCaptureModal({ roadmapSlug, trigger }: LeadCaptureModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  
  const captureLead = useCaptureLeadForRoadmap();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      companyUrl: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    captureLead.mutate(
      { slug: roadmapSlug, data },
      {
        onSuccess: () => {
          setIsSubmitted(true);
          toast({
            title: "Request received",
            description: "Lead.sh will be in touch shortly to help automate your growth.",
          });
          setTimeout(() => {
            setOpen(false);
          }, 3000);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error submitting request",
            description: "Please try again later.",
          });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="lg" className="w-full md:w-auto font-medium" variant={isSubmitted ? "secondary" : "default"}>
            {isSubmitted ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Request Submitted</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Automate these milestones with Lead.sh</>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl">You're on the list.</DialogTitle>
            <DialogDescription className="text-base">
              Our growth experts at Lead.sh will review your roadmap and reach out with an automation plan.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">Execute your roadmap faster.</DialogTitle>
              <DialogDescription className="text-base pt-2">
                Get hands-on help from Lead.sh to implement this exact strategy. We'll build the outbound systems and scale your pipeline.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email</FormLabel>
                      <FormControl>
                        <Input placeholder="jane@startup.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://startup.com" type="url" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={captureLead.isPending}>
                    {captureLead.isPending ? "Submitting..." : "Request Growth Consultation"}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
