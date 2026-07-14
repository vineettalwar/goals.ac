import { markdownToHtml } from "./markdown-html";

/**
 * Minimal Elementor layout: one section, one column, text editor widget per heading block.
 * Full widget tree stored in _elementor_data post meta by the WordPress plugin.
 */
export async function markdownToElementorData(
  markdown: string,
  title: string,
): Promise<{ content: string; elementorData: string }> {
  const html = await markdownToHtml(markdown);
  const widgetId = () =>
    Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);

  const sectionId = widgetId();
  const columnId = widgetId();
  const textId = widgetId();

  const elementorData = JSON.stringify([
    {
      id: sectionId,
      elType: "section",
      settings: {},
      elements: [
        {
          id: columnId,
          elType: "column",
          settings: { _column_size: 100 },
          elements: [
            {
              id: textId,
              elType: "widget",
              widgetType: "text-editor",
              settings: { editor: html, title },
            },
          ],
        },
      ],
    },
  ]);

  return { content: html, elementorData };
}
