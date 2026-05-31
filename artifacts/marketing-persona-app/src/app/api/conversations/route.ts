import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const list = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(50);

    return NextResponse.json({ conversations: list });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "");
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }

  try {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
