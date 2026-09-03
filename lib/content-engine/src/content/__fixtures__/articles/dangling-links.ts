import type { ArticleFixture } from "./types";

/**
 * Otherwise solid article whose internal links point to slugs that will NOT be in the
 * known-slug list supplied by the test. When knownSlugs is omitted, the dangling_internal_link
 * check is skipped entirely, so this fixture also proves that behavior.
 */
export const danglingLinks: ArticleFixture = {
  name: "dangling-links",
  title: "A Beginner's Guide to Composting in a Small Backyard",
  metaDescription:
    "Start composting in a small backyard with this beginner's guide covering bins, materials, and how to keep the pile from smelling.",
  targetKeyword: "backyard composting",
  expectation:
    "Internal links to slugs not present in the supplied known-slug list. Should block with dangling_internal_link when knownSlugs is supplied, and pass that specific check when knownSlugs is omitted.",
  bodyMarkdown: `Composting in a small backyard is easier than most people expect, and it cuts down on both trash and the bag of store-bought fertilizer you'd otherwise buy every spring.

## Picking a bin that fits a small yard

A tumbler bin works well in tight spaces because it keeps the pile contained and makes turning it a matter of a few cranks rather than a shovel and sore back. For a full comparison of bin styles, see [our compost bin buying guide](/blog/compost-bin-buying-guide), which was not part of this test's known-slug list on purpose.

## What actually goes in the pile

Kitchen scraps, coffee grounds, and yard trimmings make up the bulk of a healthy pile. Skip meat, dairy, and oily foods, since they draw pests and slow everything down. Our [full list of what to compost and what to skip](/blog/what-to-compost) covers the edge cases people usually get wrong, like citrus peels and pet waste.

## Keeping the smell down

A compost pile that smells means it's too wet or too packed with nitrogen-rich material like grass clippings. Mix in dry material such as shredded cardboard or fallen leaves, and turn the pile every week or two so air reaches the center. Persistent smell after that usually means the ratio is still off, not that composting itself is a bad fit for a small yard.

## When the compost is ready to use

Finished compost looks and smells like dark, crumbly soil, with no recognizable food scraps left. That usually takes two to four months in a tumbler and longer in an open pile, depending on the season. Once it's ready, work it into garden beds or use it as a top dressing for potted plants. Our [seasonal garden calendar](/blog/seasonal-garden-calendar) has notes on when to apply finished compost for the best results.

## Frequently Asked Questions

### Can I compost in an apartment with just a balcony?

Yes, a small tumbler or a worm bin works fine on a balcony, though a worm bin needs a bit more attention to moisture than a tumbler does.

### Do I need to add worms myself?

Not for a tumbler bin. A closed bin usually breaks material down through heat and microbes rather than worms, so you don't need to add anything.

### How often should I turn the pile?

Once a week is enough for most home setups. Turning more often speeds things up slightly but isn't required for a working pile.
`,
};
