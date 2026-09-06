import dynamic from "next/dynamic";
import { Suspense } from "react";
import { getSession } from "@/auth";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import {
  briefToDraft,
  draftFromCreateParams,
} from "@/components/content-studio/content-studio-utils";
import type { BriefContentDraft } from "@/components/content-studio/create-content-modal";
import { loadBriefForProject } from "@/lib/content/content-pieces-helpers";

const ContentStudioClient = dynamic(
  () =>
    import("@/components/content-studio/content-studio-client").then((m) => m.ContentStudioClient),
  { loading: () => <PageSkeleton /> },
);

function toUrlSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    }
  }
  return params;
}

async function resolveInitialCreateState(
  projectId: string,
  urlParams: URLSearchParams,
): Promise<{
  initialBriefDraft: BriefContentDraft | null;
  initialCreateOpen: boolean;
  initialOptimize: { url: string; keyword: string } | null;
}> {
  if (urlParams.get("optimize") === "1") {
    return {
      initialBriefDraft: null,
      initialCreateOpen: true,
      initialOptimize: {
        url: urlParams.get("url")?.trim() ?? "",
        keyword: urlParams.get("keyword")?.trim() ?? "",
      },
    };
  }

  const geoDraft = draftFromCreateParams(urlParams);
  if (geoDraft) {
    return { initialBriefDraft: geoDraft, initialCreateOpen: true, initialOptimize: null };
  }

  const briefIdParam = urlParams.get("briefId");
  if (!briefIdParam) {
    return { initialBriefDraft: null, initialCreateOpen: false, initialOptimize: null };
  }

  const briefId = Number(briefIdParam);
  if (Number.isNaN(briefId)) {
    return { initialBriefDraft: null, initialCreateOpen: false, initialOptimize: null };
  }

  const session = await getSession();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  if (!userId) {
    return { initialBriefDraft: null, initialCreateOpen: false, initialOptimize: null };
  }

  const brief = await loadBriefForProject(briefId, Number(projectId), userId);
  if (!brief) {
    return { initialBriefDraft: null, initialCreateOpen: false, initialOptimize: null };
  }

  return { initialBriefDraft: briefToDraft(brief), initialCreateOpen: true, initialOptimize: null };
}

export default async function ContentStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const urlParams = toUrlSearchParams(sp);
  const { initialBriefDraft, initialCreateOpen, initialOptimize } = await resolveInitialCreateState(id, urlParams);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ContentStudioClient
        projectId={id}
        initialBriefDraft={initialBriefDraft}
        initialCreateOpen={initialCreateOpen}
        initialOptimize={initialOptimize}
      />
    </Suspense>
  );
}
