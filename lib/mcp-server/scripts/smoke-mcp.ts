import { generateApiKey } from "@workspace/content-engine/support/auth/api-key-auth";
import { db, apiKeysTable, organizationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const [org] = await db.select({ id: organizationsTable.id }).from(organizationsTable).limit(1);
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (!org || !user) {
    console.log("NO_ORG_OR_USER");
    return;
  }
  const { rawKey, prefix, hash } = generateApiKey();
  const [row] = await db
    .insert(apiKeysTable)
    .values({
      organizationId: org.id,
      createdByUserId: user.id,
      name: "mcp-smoke-temp",
      keyPrefix: prefix,
      keyHash: hash,
      scopes: ["content:read", "content:generate"],
      rateLimitPerHour: 60,
    })
    .returning({ id: apiKeysTable.id });

  if (!row) throw new Error("Failed to insert smoke key");

  const base = process.env.MCP_BASE_URL ?? "http://localhost:3001";
  const headers = {
    Authorization: `Bearer ${rawKey}`,
    "Content-Type": "application/json",
  };

  try {
    const init = await fetch(`${base}/api/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    });
    const initBody = await init.json();

    const list = await fetch(`${base}/api/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    });
    const listBody = await list.json();

    const who = await fetch(`${base}/api/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "whoami", arguments: {} },
      }),
    });
    const whoBody = await who.json();

    const projects = await fetch(`${base}/api/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "list_projects", arguments: {} },
      }),
    });
    const projectsBody = await projects.json();

    console.log(
      JSON.stringify(
        {
          initOk: Boolean(initBody?.result?.serverInfo?.name),
          toolCount: listBody?.result?.tools?.length ?? 0,
          toolNames: (listBody?.result?.tools ?? []).map((t) => t.name),
          whoami: whoBody?.result?.structuredContent ?? whoBody?.result?.content,
          projects: projectsBody?.result?.structuredContent ?? projectsBody?.result?.content,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.delete(apiKeysTable).where(eq(apiKeysTable.id, row.id));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
