export async function register() {
  const { initCfBindings } = await import("@/lib/init-cf-bindings");
  initCfBindings();
}
