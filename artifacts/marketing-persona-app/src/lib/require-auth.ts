import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    session,
    userId: parseInt(session.user.id, 10),
    error: null,
  };
}
