export type PublishReadyItem = {
  id: "humanize" | "score" | "destination" | "media";
  label: string;
  ok: boolean;
  hint: string;
};

const DEFAULT_SCORE_FLOOR = 55;

/** Soft publish-ready checklist chips (Wave 5.B.3). */
export function buildPublishReadyChecklist(input: {
  humanized?: boolean | null;
  humanizeSkippedReason?: string | null;
  humanizationRejected?: boolean | null;
  /** 0 = no AI tells left; Humanize is optional, not a publish gate. */
  slopScore?: number | null;
  editorialScore?: number | null;
  scoreFloor?: number;
  destinationHealthOk?: boolean | null;
  needsFeaturedImage?: boolean;
  hasFeaturedImage?: boolean;
}): PublishReadyItem[] {
  const scoreFloor = input.scoreFloor ?? DEFAULT_SCORE_FLOOR;
  const humanizePassed =
    Boolean(input.humanized) ||
    Boolean(input.humanizeSkippedReason?.trim()) ||
    input.slopScore === 0;

  const scoreOk =
    input.editorialScore == null ? true : input.editorialScore >= scoreFloor;

  const destinationOk =
    input.destinationHealthOk == null ? true : input.destinationHealthOk === true;

  const mediaOk = !input.needsFeaturedImage || Boolean(input.hasFeaturedImage);

  return [
    {
      id: "humanize",
      label: "Humanize",
      ok: humanizePassed,
      hint: input.humanized
        ? "Humanize pass applied"
        : input.humanizeSkippedReason
          ? `Skipped: ${input.humanizeSkippedReason}`
          : input.slopScore === 0
            ? "No AI tells in this draft"
            : input.humanizationRejected
              ? "Last humanize was rejected — retry"
              : "Run Humanize before publish",
    },
    {
      id: "score",
      label: "Score",
      ok: scoreOk,
      hint:
        input.editorialScore == null
          ? "Score pending"
          : scoreOk
            ? `Editorial ${input.editorialScore}`
            : `Editorial ${input.editorialScore} (need ≥${scoreFloor})`,
    },
    {
      id: "destination",
      label: "Destination",
      ok: destinationOk,
      hint:
        input.destinationHealthOk == null
          ? "Health not checked yet"
          : destinationOk
            ? "Destination health OK"
            : "Fix integration health before publish",
    },
    {
      id: "media",
      label: "Media",
      ok: mediaOk,
      hint: mediaOk
        ? input.needsFeaturedImage
          ? "Featured image present"
          : "No featured image required"
        : "Add a public HTTPS featured image",
    },
  ];
}

export function publishReadyChecklistBlocks(items: PublishReadyItem[]): boolean {
  return items.some((item) => !item.ok);
}

export type ContentPiecePublishNextAction = "humanize" | "mark_ready" | "publish";

/** Suggested next step on the publish path. Publish itself stays available on draft. */
export function nextContentPiecePublishAction(input: {
  status: string;
  humanizeOk: boolean;
}): ContentPiecePublishNextAction | null {
  if (input.status === "published" || input.status === "publishing" || input.status === "generating") {
    return null;
  }
  if (!input.humanizeOk) return "humanize";
  if (input.status === "draft") return "mark_ready";
  if (input.status === "ready") return "publish";
  return null;
}
