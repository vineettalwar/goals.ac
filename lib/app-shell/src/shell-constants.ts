/** Apply to the main content column so fixed mobile header does not cover content. */
export const APP_SHELL_MAIN_OFFSET = "pt-14 lg:pt-0";

/**
 * LOCKED product page chrome (2026-09-06).
 * Do not invent per-page max-width / padding / mx-auto shells.
 * See `.cursor/rules/app-shell-grid.mdc`.
 *
 * - Left-aligned (no mx-auto): centering beside the sidebar leaves a void gutter.
 * - Same gutters on every product page.
 * - PAGE = readable default; PAGE_WIDE = dashboard / studio / dense data.
 */
export const APP_SHELL_PAGE = "w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8";

/** Wide product page chrome — dashboards and dense data surfaces. */
export const APP_SHELL_PAGE_WIDE = "w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8";
