import type { ArticleFixture } from "./types";

/**
 * Images with empty alt text, a one-word alt, and the same alt string reused across two
 * images. Exercises both the hard missing_alt_text blocker (truly empty alt) and the softer
 * weak_alt_text warning (too short, or duplicated) from analyzeAltTextCoverage.
 */
export const badAlt: ArticleFixture = {
  name: "bad-alt",
  title: "Setting Up a Home Espresso Station in a Small Kitchen",
  metaDescription:
    "How to fit a real espresso setup into a small kitchen counter, from machine choice to grinder placement and cable management.",
  targetKeyword: "home espresso station",
  expectation:
    "Empty alt (blocker), one-word alt and duplicated alt (warnings). Should trip missing_alt_text and weak_alt_text without other unrelated issues.",
  bodyMarkdown: `A good home espresso station doesn't need a dedicated room. It needs about two feet of counter, a spot near an outlet, and a plan for where the used grounds go.

## Choosing a machine for a small counter

A single-boiler machine with a built-in grinder takes up less space than separate machine and grinder units, though it usually means waiting between shots while the boiler reheats.

![](https://example.com/espresso-machine.jpg)

The photo above shows a compact single-boiler setup tucked into a corner cabinet shelf, with about six inches of clearance on either side for airflow.

## Grinder placement and cable management

Keep the grinder close enough to the machine that grounds don't scatter across the counter during the walk between them. Route the machine's power cable along the back edge of the counter rather than across the front, where it catches on towels and sleeves.

![photo](https://example.com/grinder-closeup.jpg)

Cable clips under the counter's lip keep both cords out of the way without permanent modification to the cabinetry.

## Storage for cups, tampers, and cleaning supplies

A shallow drawer near the machine holds tampers, cleaning brushes, and spare gaskets without cluttering the counter itself. Warming cups on top of the machine, if it has a flat top, saves a step compared to a separate cup warmer.

![espresso setup](https://example.com/cup-storage.jpg)

This shelf under the counter keeps everything within reach of the machine without taking up prime counter space.

![espresso setup](https://example.com/finished-station.jpg)

The finished station, with the machine, grinder, and cup storage all within an arm's reach of each other.

## Frequently Asked Questions

### Do I need a separate grinder?

For anything beyond occasional use, yes. Pre-ground coffee loses the aromatics that make espresso worth the counter space in the first place.

### How much clearance does an espresso machine actually need?

Most machines need a few inches on each side for airflow and enough headroom above to lift the portafilter out without hitting an upper cabinet.

### Is a single-boiler machine good enough for a household of four?

It works, but expect to wait thirty to sixty seconds between shots while the boiler reheats, which can slow down a busy weekend morning.
`,
};
