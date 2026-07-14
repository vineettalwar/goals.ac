import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { Logo } from "@/components/logo";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/use-auth";
import { Loader2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3001";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

function handleGoogleLogin() {
  window.location.href = `${API_BASE}/api/auth/google`;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth_failed" ? "Google sign-in failed. Please try again." : null
  );

  const from = (location.state as { from?: string })?.from ?? "/dashboard";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <AuthShell>
      <SEO title="Sign In — goals.ac" description="Sign in to your goals.ac account." />
      <div className="flex-1 flex items-center justify-center py-16 px-4 bg-background min-h-[80vh] relative overflow-hidden">
        <div className="orb orb-primary w-[500px] h-[400px] top-[-10%] left-[50%] -translate-x-1/2 pointer-events-none dark:block hidden" />
        <div className="orb orb-violet w-[300px] h-[300px] bottom-[-5%] right-[5%] pointer-events-none dark:block hidden" />

        <Card className="w-full max-w-md relative z-10 border shadow-sm">
          <CardHeader className="text-center pb-6">
            <Logo size={24} className="mb-1" />
            <CardTitle className="text-xl font-bold">Welcome back</CardTitle>
            <CardDescription>Sign in to your goals.ac account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4 gap-2"
              onClick={handleGoogleLogin}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-card px-2">or</span>
              </div>
            </div>

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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          to="/forgot-password"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a href={`${MARKETING_URL}/signup`} className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign up
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
