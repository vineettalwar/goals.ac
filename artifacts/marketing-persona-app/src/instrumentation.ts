export async function register() {
  const { ensureD1Binding } = await import("@/lib/ensure-d1-binding");
  ensureD1Binding();
}
