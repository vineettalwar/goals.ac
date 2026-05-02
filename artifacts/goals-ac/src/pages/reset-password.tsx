import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
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
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const body = await res.json() as { error?: string; token?: string; user?: { id: number; email: string; name: string } };
      if (!res.ok) {
        throw new Error(body.error ?? "Something went wrong");
      }
      if (body.token && body.user) {
        setAuth(body.token, body.user);
      }
      setSuccess(true);
      setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!token) {
    return (
      <Layout>
        <SEO title="Reset Password — goals.ac" description="Reset your goals.ac password." />
        <div className="flex-1 flex items-center justify-center py-16 px-4 bg-mesh-dark min-h-[80vh] relative overflow-hidden">
          <div className="orb orb-primary w-[500px] h-[400px] top-[-10%] left-[50%] -translate-x-1/2 pointer-events-none" />
          <Card className="w-full max-w-md relative z-10 glass-card border-white/10 shadow-2xl shadow-black/50">
            <CardHeader className="text-center pb-6">
              <Logo size={24} className="mb-1" />
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-400/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold">Invalid reset link</CardTitle>
              <CardDescription>This password reset link is invalid or has expired.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Reset Password — goals.ac" description="Set a new password for your goals.ac account." />
      <div className="flex-1 flex items-center justify-center py-16 px-4 bg-mesh-dark min-h-[80vh] relative overflow-hidden">
        <div className="orb orb-primary w-[500px] h-[400px] top-[-10%] left-[50%] -translate-x-1/2 pointer-events-none" />
        <div className="orb orb-violet w-[300px] h-[300px] bottom-[-5%] right-[5%] pointer-events-none" />

        <Card className="w-full max-w-md relative z-10 glass-card border-white/10 shadow-2xl shadow-black/50">
          <CardHeader className="text-center pb-6">
            <Logo size={24} className="mb-1" />
            {success ? (
              <>
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-400/20 flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold">Password updated!</CardTitle>
                <CardDescription>You're now signed in. Redirecting to your dashboard…</CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-xl font-bold">Set a new password</CardTitle>
                <CardDescription>Choose a strong password for your account.</CardDescription>
              </>
            )}
          </CardHeader>
          {!success && (
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
                      {error}{" "}
                      {error.toLowerCase().includes("expired") || error.toLowerCase().includes("invalid") ? (
                        <Link to="/forgot-password" className="underline hover:text-red-300">Request a new link.</Link>
                      ) : null}
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Min. 8 characters"
                            className="bg-white/5 border-white/10 hover:border-white/20 transition-colors"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm new password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Repeat password"
                            className="bg-white/5 border-white/10 hover:border-white/20 transition-colors"
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
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating password...</>
                    ) : (
                      "Update password"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          )}
        </Card>
      </div>
    </Layout>
  );
}
