/** True when HTTP handlers must not run heavy inline work (CF Free edge). */
export function isCfEdgeHttp(): boolean {
  return (
    process.env.CF_EDGE_HTTP === "1" ||
    process.env.FORCE_QUEUE_WRITES === "1"
  );
}
