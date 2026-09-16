import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
