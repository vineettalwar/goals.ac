import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center py-32 text-center px-4">
        <p className="text-sm font-medium text-muted-foreground mb-4">404</p>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Page not found</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          The page you're looking for doesn't exist. Try generating a new growth roadmap.
        </p>
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </Layout>
  );
}
