/**
 * Shared shape for the end-to-end evaluation fixtures in this directory. Each fixture is a
 * realistic, full-length draft designed to exercise one part of the content-quality stack
 * (publish-readiness, AI-tell diagnosis, keyword density, alt-text coverage, article scoring).
 *
 * See ../eval.test.ts for how these are consumed and ../README.md for how to add one.
 */
export type ArticleFixture = {
  /** Short identifier, matches the filename without extension. */
  name: string;
  /** Full article body as Markdown. */
  bodyMarkdown: string;
  /** Article title, as it would appear as an H1 / CMS title field. */
  title: string;
  /** Meta description for the piece. */
  metaDescription: string;
  /** The primary keyword phrase this article is meant to rank for. */
  targetKeyword: string;
  /** What this fixture is designed to exercise. */
  expectation: string;
};
