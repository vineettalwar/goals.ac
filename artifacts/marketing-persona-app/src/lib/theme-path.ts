/** Product app routes that may use ink-dark chrome. Marketing stays newsprint. */
export function isProductAppPath(pathname: string): boolean {
  return /^\/(dashboard|projects|studio|settings|admin|content-piece|content-pieces|onboarding|audit|research|search|strategy|integrations|growth-roadmaps|partner|autopilot)(\/|$)/.test(
    pathname,
  );
}
