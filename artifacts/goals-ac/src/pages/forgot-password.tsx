import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { Logo } from "@/components/logo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MailCheck, ArrowLeft } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Something went wrong");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Layout>
      <SEO title="Reset Password — goals.ac" description="Reset your goals.ac password." />
      <div className="flex-1 flex items-center justify-center py-16 px-4 bg-mesh-dark min-h-[80vh] relative overflow-hidden">
        <div className="orb orb-primary w-[500px] h-[400px] top-[-10%] left-[50%] -translate-x-1/2 pointer-events-none" />
        <div className="orb orb-violet w-[300px] h-[300px] bottom-[-5%] right-[5%] pointer-events-none" />

        <Card className="w-full max-w-md relative z-10 glass-card border-white/10 shadow-2xl shadow-black/50">
          <CardHeader className="text-center pb-6">
            <Logo size={24} className="mb-1" />
            {submitted ? (
              <>
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-400/20 flex items-center justify-center">
                    <MailCheck className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold">Check your email</CardTitle>
                <CardDescription>
                  If an account exists for that email, we've sent a password reset link. Check your inbox (and spam folder).
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-xl font-bold">Forgot your password?</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a link to reset your password.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSubmitted(false); form.reset(); }}
                >
                  Send another link
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to sign in
                  </Link>
                </p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
                      {error}
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className=""
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending link...</>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-1">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to sign in
                    </Link>
                  </p>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
