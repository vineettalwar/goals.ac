import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { locationsTable } from "@workspace/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const locations = await db
      .select()
      .from(locationsTable)
      .orderBy(asc(locationsTable.name));
    return NextResponse.json(locations);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
