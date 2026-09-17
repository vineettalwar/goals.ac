/** TanStack Query v5 keeps disabled queries `isPending` without data — that is not loading. */
export function dashboardQueryLoading(
  enabled: boolean,
  isPending: boolean,
  hasData: boolean,
): boolean {
  return enabled && isPending && !hasData;
}
