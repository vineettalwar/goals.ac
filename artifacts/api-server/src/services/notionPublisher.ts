import { assertPublicUrl } from "../lib/ssrf-guard";

const NOTION_VERSION = "2022-06-28";
const NOTION_API = "https://api.notion.com/v1";

interface RichText {
  type: "text";
  text: { content: string; link?: { url: string } | null };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
  };
}

type NotionBlock =
  | { object: "block"; type: "heading_1"; heading_1: { rich_text: RichText[] } }
  | { object: "block"; type: "heading_2"; heading_2: { rich_text: RichText[] } }
  | { object: "block"; type: "heading_3"; heading_3: { rich_text: RichText[] } }
  | { object: "block"; type: "paragraph"; paragraph: { rich_text: RichText[] } }
  | { object: "block"; type: "bulleted_list_item"; bulleted_list_item: { rich_text: RichText[] } }
  | { object: "block"; type: "numbered_list_item"; numbered_list_item: { rich_text: RichText[] } }
  | { object: "block"; type: "code"; code: { rich_text: RichText[]; language: string } }
  | { object: "block"; type: "divider"; divider: Record<string, never> };

function parseInlineMarkdown(text: string): RichText[] {
  const result: RichText[] = [];
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|`([^`]+?)`|\*(.+?)\*|_(.+?)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: "text", text: { content: text.slice(lastIndex, match.index) } });
    }
    if (match[2] ?? match[3]) {
      result.push({ type: "text", text: { content: (match[2] ?? match[3])! }, annotations: { bold: true } });
    } else if (match[4]) {
      result.push({ type: "text", text: { content: match[4] }, annotations: { code: true } });
    } else if (match[5] ?? match[6]) {
      result.push({ type: "text", text: { content: (match[5] ?? match[6])! }, annotations: { italic: true } });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", text: { content: text.slice(lastIndex) } });
  }

  return result.length > 0 ? result : [{ type: "text", text: { content: text } }];
}

export function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  const lines = markdown.split("\n");
  const blocks: NotionBlock[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          object: "block",
          type: "code",
          code: {
            rich_text: [{ type: "text", text: { content: codeLines.join("\n") } }],
            language: codeLang || "plain text",
          },
        });
        codeLines = [];
        codeLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ object: "block", type: "heading_1", heading_1: { rich_text: parseInlineMarkdown(line.slice(2)) } });
    } else if (line.startsWith("## ")) {
      blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: parseInlineMarkdown(line.slice(3)) } });
    } else if (line.startsWith("### ")) {
      blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: parseInlineMarkdown(line.slice(4)) } });
    } else if (/^[-*] /.test(line)) {
      blocks.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: parseInlineMarkdown(line.slice(2)) } });
    } else if (/^\d+\. /.test(line)) {
      const text = line.replace(/^\d+\. /, "");
      blocks.push({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: parseInlineMarkdown(text) } });
    } else if (line.trim() === "---" || line.trim() === "***") {
      blocks.push({ object: "block", type: "divider", divider: {} });
    } else if (line.trim() === "") {
      // skip blank lines
    } else {
      blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: parseInlineMarkdown(line) } });
    }
  }

  return blocks;
}

interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: string;
}

async function fetchDatabaseProperties(
  integrationToken: string,
  databaseId: string,
): Promise<Record<string, NotionDatabaseProperty>> {
  const res = await fetch(`${NOTION_API}/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${integrationToken}`,
      "Notion-Version": NOTION_VERSION,
    },
  });
  if (!res.ok) return {};
  const db = await res.json() as { properties?: Record<string, NotionDatabaseProperty> };
  return db.properties ?? {};
}

export async function publishToNotion(
  integrationToken: string,
  databaseId: string,
  title: string,
  bodyMarkdown: string,
  meta?: { status?: string; tags?: string[] },
): Promise<string> {
  await assertPublicUrl(NOTION_API);

  const [blocks, dbProperties] = await Promise.all([
    Promise.resolve(markdownToNotionBlocks(bodyMarkdown)),
    fetchDatabaseProperties(integrationToken, databaseId),
  ]);

  const pageProperties: Record<string, unknown> = {};

  const titlePropName = Object.keys(dbProperties).find(
    (k) => dbProperties[k].type === "title",
  ) ?? "Name";
  pageProperties[titlePropName] = {
    title: [{ type: "text", text: { content: title } }],
  };

  if (meta?.status) {
    const statusProp = Object.entries(dbProperties).find(
      ([, v]) => v.type === "status" || v.type === "select",
    );
    if (statusProp) {
      const [propName, propDef] = statusProp;
      if (propDef.type === "status") {
        pageProperties[propName] = { status: { name: meta.status } };
      } else {
        pageProperties[propName] = { select: { name: meta.status } };
      }
    }
  }

  if (meta?.tags && meta.tags.length > 0) {
    const tagsProp = Object.entries(dbProperties).find(
      ([, v]) => v.type === "multi_select",
    );
    if (tagsProp) {
      const [propName] = tagsProp;
      pageProperties[propName] = {
        multi_select: meta.tags.map((t) => ({ name: t })),
      };
    }
  }

  const backlink: NotionBlock = {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        { type: "text", text: { content: "Published via " } },
        { type: "text", text: { content: "goals.ac", link: { url: "https://goals.ac" } } },
      ],
    },
  };

  const allBlocks = [...blocks, { object: "block", type: "divider", divider: {} } as NotionBlock, backlink];

  const createBody: Record<string, unknown> = {
    parent: { database_id: databaseId },
    properties: pageProperties,
    children: allBlocks.slice(0, 100),
  };

  const createRes = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${integrationToken}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify(createBody),
  });

  if (!createRes.ok) {
    const body = await createRes.json().catch(() => ({})) as { message?: string; code?: string };
    if (createRes.status === 401) throw new Error("Notion authentication failed. Check your integration token.");
    if (createRes.status === 404) throw new Error("Notion database not found. Check the database ID.");
    throw new Error(body.message ?? `Notion API error: ${createRes.status}`);
  }

  const page = await createRes.json() as { id: string; url: string };
  return page.url;
}
