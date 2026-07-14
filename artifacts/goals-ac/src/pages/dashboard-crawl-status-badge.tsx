import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export function CrawlStatusBadge({ status }: { status: string }) {
  if (status === "done") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Crawled
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25">
      <Clock className="w-3 h-3 mr-1" />
      Crawling...
    </Badge>
  );
}
