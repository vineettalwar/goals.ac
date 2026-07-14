export async function safeJson<T>(r: Response): Promise<T | null> {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
