import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  Loader2,
  Search,
} from "lucide-react";
import { BrandProfileEditView } from "./brand-edit-ui";
import { VoiceStyleEditView } from "./voice-edit-ui";
import { cn } from "../cn";
import {
  brandProfileToFormValues,
  contentPiecePath,
  contentStudioPath,
  contentStyleToFormValues,
  formValuesToSavePayload,
  formValuesToVoiceSavePayload,
  type BrandProfileSavePayload,
  type ProjectDetailBrandProfile,
  type ProjectDetailContentStyle,
  type ProjectDetailPiece,
  type ProjectDetailProject,
  type ProjectDetailTab,
  type VoiceStyleSavePayload,
  scrapeFailed,
  scrapeIsPending,
  scrapeWasAutoFilled,
} from "./types";

export type ProjectDetailLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

function DetailLink({
  renderLink,
  ...props
}: ProjectDetailLinkProps & {
  renderLink: (props: ProjectDetailLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-emerald-100 text-emerald-800",
    published: "bg-primary text-primary-foreground",
    draft: "bg-muted text-muted-foreground",
    generating: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        styles[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function BrandTabPanel({
  brand,
  onSaveBrand,
  savingBrand,
}: {
  brand: ProjectDetailBrandProfile | null;
  onSaveBrand?: (payload: BrandProfileSavePayload) => void | Promise<void>;
  savingBrand?: boolean;
}) {
  const [formValues, setFormValues] = useState(() => brandProfileToFormValues(brand));

  useEffect(() => {
    setFormValues(brandProfileToFormValues(brand));
  }, [brand]);

  if (onSaveBrand) {
    return (
      <BrandProfileEditView
        values={formValues}
        onChange={setFormValues}
        onSave={() => onSaveBrand(formValuesToSavePayload(formValues))}
        saving={savingBrand}
      />
    );
  }

  if (!brand) {
    return (
      <div className="paper-card rounded-xl border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No brand profile yet. Run a website scan or add details in the full product app.
        </p>
      </div>
    );
  }

  return (
    <div className="paper-card grid gap-6 p-6 sm:grid-cols-2">
      <FieldRow label="Company" value={brand.companyName} />
      <FieldRow label="Industry" value={brand.industry} />
      <FieldRow label="Target audience" value={brand.targetAudience} />
      <FieldRow label="Voice & tone" value={brand.voiceTone} />
      <div className="sm:col-span-2">
        <FieldRow
          label="Primary keywords"
          value={
            brand.primaryKeywords?.length ? brand.primaryKeywords.join(", ") : null
          }
        />
      </div>
      <div className="sm:col-span-2">
        <FieldRow
          label="Competitors"
          value={
            brand.competitorUrls?.length ? brand.competitorUrls.join(", ") : null
          }
        />
      </div>
    </div>
  );
}

function VoiceTabPanel({
  style,
  onSaveVoice,
  savingVoice,
}: {
  style: ProjectDetailContentStyle | null;
  onSaveVoice?: (payload: VoiceStyleSavePayload) => void | Promise<void>;
  savingVoice?: boolean;
}) {
  const [formValues, setFormValues] = useState(() => contentStyleToFormValues(style));

  useEffect(() => {
    setFormValues(contentStyleToFormValues(style));
  }, [style]);

  if (onSaveVoice) {
    return (
      <VoiceStyleEditView
        values={formValues}
        onChange={setFormValues}
        onSave={() => onSaveVoice(formValuesToVoiceSavePayload(formValues))}
        saving={savingVoice}
      />
    );
  }

  if (!style) {
    return (
      <div className="paper-card rounded-xl border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">No brand voice settings configured yet.</p>
      </div>
    );
  }

  return (
    <div className="paper-card grid gap-6 p-6 sm:grid-cols-2">
      <FieldRow label="Tone" value={style.tonePreset} />
      <FieldRow label="Persona" value={style.personaName} />
      <FieldRow
        label="Default word count"
        value={style.defaultWordCount != null ? String(style.defaultWordCount) : null}
      />
      <FieldRow label="Primary language" value={style.primaryLanguage} />
      <FieldRow label="Reading level" value={style.readingLevel} />
      <FieldRow label="Humanization" value={style.humanizationLevel} />
    </div>
  );
}

function ContentTabPanel({
  pieces,
  projectId,
  renderLink,
}: {
  pieces: ProjectDetailPiece[];
  projectId: number;
  renderLink: (props: ProjectDetailLinkProps) => ReactNode;
}) {
  if (pieces.length === 0) {
    return (
      <div className="paper-card flex flex-col items-center rounded-xl border-dashed p-12 text-center">
        <FileText className="mb-4 h-10 w-10 text-primary/60" aria-hidden />
        <h3 className="mb-2 text-lg font-semibold">No content yet</h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Generate articles and guides from Content Studio. Linked content appears here
          automatically.
        </p>
        <DetailLink
          renderLink={renderLink}
          href={contentStudioPath(projectId)}
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Open Content Studio
        </DetailLink>
      </div>
    );
  }

  return (
    <div className="paper-card divide-y overflow-hidden">
      {pieces.map((piece) => (
        <DetailLink
          key={piece.id}
          renderLink={renderLink}
          href={contentPiecePath(piece.id)}
          className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary/30"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{piece.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {piece.targetKeyword ? `${piece.targetKeyword} · ` : ""}
              {piece.wordCount != null ? `${piece.wordCount} words` : "Content piece"}
            </p>
          </div>
          <StatusBadge status={piece.status} />
        </DetailLink>
      ))}
    </div>
  );
}

function PublishingTabPanel({
  projectId,
  renderLink,
}: {
  projectId: number;
  renderLink: (props: ProjectDetailLinkProps) => ReactNode;
}) {
  return (
    <div className="paper-card space-y-4 p-6">
      <h3 className="font-semibold">Publishing & integrations</h3>
      <p className="text-sm text-muted-foreground">
        Connect WordPress, Shopify, Ghost, Webflow, and other CMS platforms to publish content from
        goals.ac.
      </p>
      <DetailLink
        renderLink={renderLink}
        href={`/integrations?project=${projectId}`}
        className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
      >
        Manage integrations
      </DetailLink>
    </div>
  );
}

export function ProjectDetailView({
  project,
  activeTab,
  onTabChange,
  contentCount,
  brandProfile,
  contentStyle,
  pieces,
  onRescan,
  rescanning,
  onSaveBrand,
  savingBrand,
  onSaveVoice,
  savingVoice,
  renderLink,
  backHref = "/dashboard",
}: {
  project: ProjectDetailProject;
  activeTab: ProjectDetailTab;
  onTabChange: (tab: ProjectDetailTab) => void;
  contentCount: number;
  brandProfile: ProjectDetailBrandProfile | null;
  contentStyle: ProjectDetailContentStyle | null;
  pieces: ProjectDetailPiece[];
  onRescan?: () => void;
  rescanning?: boolean;
  onSaveBrand?: (payload: BrandProfileSavePayload) => void | Promise<void>;
  savingBrand?: boolean;
  onSaveVoice?: (payload: VoiceStyleSavePayload) => void | Promise<void>;
  savingVoice?: boolean;
  renderLink: (props: ProjectDetailLinkProps) => ReactNode;
  backHref?: string;
}) {
  const isScraping = scrapeIsPending(project.scrapeStatus);
  const wasAutoFilled = scrapeWasAutoFilled(project.scrapeStatus);
  const failed = scrapeFailed(project.scrapeStatus);

  const tabs: Array<{ id: ProjectDetailTab; label: string }> = [
    { id: "brand", label: "Brand Profile" },
    { id: "voice", label: "Brand Voice" },
    { id: "content", label: "Your Content" },
    { id: "publishing", label: "Publishing" },
  ];

  return (
    <div className="max-w-5xl space-y-6 px-8 py-8">
      <DetailLink
        renderLink={renderLink}
        href={backHref}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Dashboard
      </DetailLink>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            {project.url.replace(/^https?:\/\//, "")}
          </a>
        </div>
        {project.pageCount != null && project.pageCount > 0 ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" aria-hidden />
            {project.pageCount} pages
          </span>
        ) : null}
      </div>

      {isScraping ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Analyzing your website…
        </div>
      ) : null}
      {failed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Website scan failed — review brand fields manually or try again.
          {onRescan ? (
            <button
              type="button"
              onClick={onRescan}
              disabled={rescanning}
              className="ml-2 font-medium underline hover:no-underline disabled:opacity-50"
            >
              {rescanning ? "Starting…" : "Re-scan"}
            </button>
          ) : null}
        </div>
      ) : null}
      {wasAutoFilled && !isScraping ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Brand profile extracted from your website.
          {onRescan ? (
            <button
              type="button"
              onClick={onRescan}
              disabled={rescanning}
              className="ml-2 font-medium underline hover:no-underline disabled:opacity-50"
            >
              {rescanning ? "Starting…" : "Re-scan"}
            </button>
          ) : null}
        </div>
      ) : null}

      <div>
        <DetailLink
          renderLink={renderLink}
          href={contentStudioPath(project.id)}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Layers className="h-4 w-4" aria-hidden />
          Open Content Studio
        </DetailLink>
        <p className="mt-2 text-xs text-muted-foreground">
          Generate blog posts, guides, whitepapers, and more from your brand profile.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm",
              activeTab === tab.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.id === "content" && contentCount > 0 ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{contentCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "brand" ? (
        <BrandTabPanel brand={brandProfile} onSaveBrand={onSaveBrand} savingBrand={savingBrand} />
      ) : null}
      {activeTab === "voice" ? (
        <VoiceTabPanel
          style={contentStyle}
          onSaveVoice={onSaveVoice}
          savingVoice={savingVoice}
        />
      ) : null}
      {activeTab === "content" ? (
        <ContentTabPanel pieces={pieces} projectId={project.id} renderLink={renderLink} />
      ) : null}
      {activeTab === "publishing" ? (
        <PublishingTabPanel projectId={project.id} renderLink={renderLink} />
      ) : null}

      <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
        {[
          {
            label: "Content Studio",
            href: contentStudioPath(project.id),
            icon: <Layers className="h-5 w-5" aria-hidden />,
          },
          {
            label: "SEO Articles",
            href: `${contentStudioPath(project.id)}#seo`,
            icon: <FileText className="h-5 w-5" aria-hidden />,
          },
          { label: "GEO Audit", href: "/audit", icon: <Search className="h-5 w-5" aria-hidden /> },
          {
            label: "Analytics",
            href: "/search/performance",
            icon: <BarChart3 className="h-5 w-5" aria-hidden />,
          },
        ].map((item) => (
          <DetailLink
            key={item.label}
            renderLink={renderLink}
            href={item.href}
            className="paper-card flex cursor-pointer flex-col items-center gap-2 rounded-xl p-4 text-center transition-colors hover:bg-muted/40"
          >
            <span className="text-primary">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </DetailLink>
        ))}
      </div>
    </div>
  );
}

export function ProjectDetailNotFound({
  renderLink,
}: {
  renderLink: (props: ProjectDetailLinkProps) => ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <h2 className="mb-2 text-xl font-semibold">Project not found</h2>
      <p className="mb-6 text-muted-foreground">
        This project doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <DetailLink
        renderLink={renderLink}
        href="/dashboard"
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to Dashboard
      </DetailLink>
    </div>
  );
}
