import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { industriesTable } from "@workspace/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const industries = await db
      .select()
      .from(industriesTable)
      .orderBy(asc(industriesTable.name));
    return NextResponse.json(industries);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
