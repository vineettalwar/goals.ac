import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-6">
      <p className="text-7xl font-bold text-primary/20">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground text-sm max-w-xs">
        This page doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>
    </div>
  );
}
