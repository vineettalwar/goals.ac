import { NextResponse } from "next/server";
import { handleGoogleSheetsCallback } from "@/lib/integrations/google-sheets-oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/search/keywords?sheets=error`,
    );
  }

  if (!code || !state) {
    return new NextResponse("Missing OAuth code or state", { status: 400 });
  }

  return handleGoogleSheetsCallback(code, state);
}
