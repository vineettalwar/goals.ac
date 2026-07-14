export type DecryptedDeeplCredentialContext = {
  org?: string;
  project?: string;
};

export function resolveDeeplApiKey(ctx?: DecryptedDeeplCredentialContext): string | undefined {
  const projectKey = ctx?.project?.trim();
  if (projectKey) return projectKey;

  const orgKey = ctx?.org?.trim();
  if (orgKey) return orgKey;

  return undefined;
}

export function resolveDeeplCredentialSource(
  ctx?: DecryptedDeeplCredentialContext,
): "project" | "org" | null {
  if (ctx?.project?.trim()) return "project";
  if (ctx?.org?.trim()) return "org";
  return null;
}
