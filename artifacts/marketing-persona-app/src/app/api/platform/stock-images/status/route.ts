import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getPlatformStockImageStatus } from "@workspace/stock-images";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(getPlatformStockImageStatus());
}
