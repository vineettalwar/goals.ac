# Content-quality eval fixtures

This directory closes a gap the unit tests don't cover: `publish-readiness.ts`, `ai-writing-rules.ts`,
`seo-guardrails.ts`, and `article-quality-score.ts` are each unit-tested in isolation, but nothing
checked that the system as a whole *ranks real articles correctly*. `eval.test.ts` runs every
fixture in `articles/` through the full stack and asserts the ranking and outcomes a human editor
would expect.

## What's here

- `articles/`: realistic, full-length (roughly 1,200-1,800 word, except `thin`) Markdown article
  fixtures, one per `.ts` file, each exporting a typed `ArticleFixture` (see `articles/types.ts`).
  `articles/index.ts` re-exports all of them.
- `eval.test.ts`: the end-to-end suite that scores every fixture and asserts on the ranking.

## Adding a fixture

1. Pick what gap you're closing. Every fixture here exists to isolate one thing (a bad keyword
   density, a dangling link, weak alt text, an anti-false-positive check) so a test failure points
   at one cause.
2. Write real prose. No lorem ipsum, and don't hit a word count by repeating a paragraph, except
   where the fixture's entire point is being short (like `thin`).
3. Create `articles/<name>.ts` exporting a `const <camelCaseName>: ArticleFixture = { ... }` with a
   clear `expectation` string describing what the fixture is designed to exercise.
4. Re-export it from `articles/index.ts`.
5. Add assertions to `eval.test.ts`. Import the fixture, not a copy of its body.

## The rule: assert relative, not absolute

Every threshold in the content-quality stack (density bands, AI-tell weights, score cutoffs) is a
tunable heuristic, not a law of nature. An eval suite pinned to exact totals breaks every time
someone nudges a threshold by one point, and a broken CI check that nobody trusts gets ignored or
deleted, which is worse than not having the check at all.

So: prefer ordering (`clean` scores higher than `sloppy`), membership (`blockers` contains
`keyword_stuffing`), and boolean outcomes (`result.ok === true`). Where you do need a number, use a
generous range with a one-line comment explaining why that bound and not a tighter one. If a
fixture's whole purpose is to prove the system does NOT do something (the `borderline` anti-false-
positive guard is the clearest example), say so directly in the fixture's `expectation` and in the
test's `it(...)` description, so a future reader understands why the assertion goes the direction
it does.

## If a fixture exposes a real bug

Don't bend the fixture to make the suite pass. If `assessPublishReadiness` blocks something it
shouldn't, or scores a genuinely bad draft as good, that's the harness doing its job. Write the
assertion to describe *correct* behavior and mark it `it.fails` (or skip with a comment) so the
gap stays visible in test output instead of disappearing into a fixture that was quietly rewritten
to dodge it. See the two `it.fails` cases at the bottom of `eval.test.ts` for the pattern.
