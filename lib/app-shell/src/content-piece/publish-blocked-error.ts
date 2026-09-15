export type PublishReadinessIssueView = {
  message: string;
  detail?: string;
};

export class PublishBlockedError extends Error {
  readonly blockers: PublishReadinessIssueView[];

  constructor(
    blockers: PublishReadinessIssueView[],
    message = "Content not ready to publish",
  ) {
    super(message);
    this.name = "PublishBlockedError";
    this.blockers = blockers;
  }
}

export function isPublishBlockedError(err: unknown): err is PublishBlockedError {
  if (!err || typeof err !== "object") return false;
  if (err instanceof PublishBlockedError) return true;
  const blockers = (err as { blockers?: unknown }).blockers;
  if (!Array.isArray(blockers) || blockers.length === 0) return false;
  return blockers.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as { message?: unknown }).message === "string" &&
      (item as { message: string }).message.trim().length > 0,
  );
}

export function publishBlockedErrorFromBody(body: unknown): PublishBlockedError | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as { error?: unknown; blockers?: unknown };
  if (!Array.isArray(rec.blockers) || rec.blockers.length === 0) return null;

  const blockers: PublishReadinessIssueView[] = [];
  for (const item of rec.blockers) {
    if (!item || typeof item !== "object") continue;
    const message = (item as { message?: unknown }).message;
    if (typeof message !== "string" || !message.trim()) continue;
    const detail = (item as { detail?: unknown }).detail;
    blockers.push({
      message,
      detail: typeof detail === "string" && detail.trim() ? detail : undefined,
    });
  }
  if (blockers.length === 0) return null;

  const heading =
    typeof rec.error === "string" && rec.error.trim()
      ? rec.error
      : "Content not ready to publish";
  return new PublishBlockedError(blockers, heading);
}
