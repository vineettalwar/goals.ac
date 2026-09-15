export type DataForSeoCredentials = {
  login: string;
  password: string;
};

let overlay: DataForSeoCredentials | null = null;

/** In-memory DB-hydrated creds. Env vars still win. Never write these onto process.env. */
export function setDataForSeoCredentialsOverlay(creds: DataForSeoCredentials | null): void {
  overlay = creds;
}

export function getDataForSeoCredentials(): DataForSeoCredentials | null {
  const login = process.env["DATAFORSEO_LOGIN"]?.trim();
  const password = process.env["DATAFORSEO_PASSWORD"]?.trim();
  if (login && password) return { login, password };
  if (overlay?.login && overlay?.password) return overlay;
  return null;
}
