import { markdownToHtml } from "./markdown-html";

/**
 * Generate Divi builder shortcodes wrapping semantic HTML.
 * Divi stores layout in post_content as shortcodes when using the classic builder.
 */
export async function markdownToDiviShortcodes(markdown: string): Promise<string> {
  const html = await markdownToHtml(markdown);
  return `[et_pb_section][et_pb_row][et_pb_column type="4_4"][et_pb_text]${html}[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]`;
}
