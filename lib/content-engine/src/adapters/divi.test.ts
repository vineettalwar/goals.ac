import { describe, expect, it } from "vitest";
import { markdownToDiviShortcodes } from "./divi";

/** Every [et_pb_...] shortcode tag name, open or close, in appearance order. */
function shortcodeTags(markup: string): string[] {
  return [...markup.matchAll(/\[\/?(\w+)[^\]]*\]/g)].map((m) => m[1]!);
}

describe("markdownToDiviShortcodes", () => {
  it("wraps content in one section/row/column, matching the previous top-level layout", async () => {
    const markup = await markdownToDiviShortcodes("Text.");

    expect(markup).toContain('[et_pb_section][et_pb_row][et_pb_column type="4_4"]');
    expect(markup).toContain("[/et_pb_column][/et_pb_row][/et_pb_section]");
  });

  it("emits one module per block instead of one blob for the whole article", async () => {
    const markup = await markdownToDiviShortcodes("## Heading\n\nA paragraph.\n\n- one\n- two");
    const textModules = markup.match(/\[et_pb_text\]/g) ?? [];

    expect(markup).toContain("et_pb_heading");
    // Paragraph and list each get their own et_pb_text module.
    expect(textModules).toHaveLength(2);
  });

  it("uses the native heading module with the heading text as the title attribute", async () => {
    const markup = await markdownToDiviShortcodes("### Third level");

    expect(markup).toContain('[et_pb_heading title="Third level" /]');
  });

  it("escapes a double quote in heading text so the shortcode does not truncate", async () => {
    const markup = await markdownToDiviShortcodes('## The "Best" WordPress Plugins');

    expect(markup).toContain('[et_pb_heading title="The &quot;Best&quot; WordPress Plugins" /]');
    // Every opened tag must still have its matching close — proof the
    // embedded quote did not break out of the attribute.
    const tags = shortcodeTags(markup);
    expect(tags.filter((t) => t === "et_pb_section")).toHaveLength(2);
  });

  it("escapes an ampersand in heading text so entities do not double-encode", async () => {
    const markup = await markdownToDiviShortcodes("## Cats & Dogs");

    expect(markup).toContain('title="Cats &amp; Dogs"');
  });

  it("renders a paragraph as a text module with real markup", async () => {
    const markup = await markdownToDiviShortcodes("Some **bold** text.");

    expect(markup).toContain("[et_pb_text]<p>Some <strong>bold</strong> text.</p>[/et_pb_text]");
  });

  it("renders a list as a text module with a real list tag", async () => {
    const markup = await markdownToDiviShortcodes("1. first\n2. second");

    expect(markup).toContain("<ol>");
    expect(markup).toContain("<li>first</li>");
  });

  it("renders code as a text module with escaped content", async () => {
    const markup = await markdownToDiviShortcodes("```\n<script>x</script>\n```");

    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>x</script>");
  });

  it("uses the native image module with escaped src and alt attributes", async () => {
    const markup = await markdownToDiviShortcodes('![a "cat"](https://example.com/cat.jpg)');

    expect(markup).toContain(
      '[et_pb_image src="https://example.com/cat.jpg" alt="a &quot;cat&quot;" /]',
    );
  });

  it("balances every opened shortcode tag with a matching close", async () => {
    const markup = await markdownToDiviShortcodes(
      '## Heading "quoted"\n\nA paragraph.\n\n- one\n- two\n\n![alt](https://example.com/x.png)\n\n```\ncode\n```',
    );

    // Self-closing modules (heading, image) need no counterpart; container
    // and text modules need one close per open. An embedded quote breaking
    // out of an attribute would desync this count.
    const counts = new Map<string, { open: number; close: number }>();
    for (const match of markup.matchAll(/\[(\/?)(\w+)[^\]]*?(\/?)\]/g)) {
      const [, closeSlash, name, selfClose] = match;
      if (selfClose) continue;
      const entry = counts.get(name!) ?? { open: 0, close: 0 };
      if (closeSlash) entry.close += 1;
      else entry.open += 1;
      counts.set(name!, entry);
    }

    for (const [name, { open, close }] of counts) {
      expect(open, `${name} open/close mismatch`).toBe(close);
    }
  });

  it("falls back to an empty text module for empty markdown", async () => {
    const markup = await markdownToDiviShortcodes("");

    expect(markup).toContain("[et_pb_text][/et_pb_text]");
  });
});
