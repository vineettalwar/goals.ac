import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contactSubmissionsTable } from "@workspace/db/schema";
import { z } from "zod";
import { sendEmail } from "@/lib/utils/email";
import { CONTACT_EMAIL } from "@/lib/marketing/site/marketing-contact";

const Body = z.object({
  email: z.string().email(),
  message: z.string().max(5000).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const message = parsed.data.message?.trim() || null;

  try {
    await db.insert(contactSubmissionsTable).values({ email, message });
  } catch {
    return NextResponse.json({ error: "Could not save message" }, { status: 500 });
  }

  try {
    const messageBlock = message
      ? `<p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br />")}</p>`
      : "<p><em>No message provided.</em></p>";

    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `New contact form submission from ${email}`,
      html: `
        <p><strong>From:</strong> ${email}</p>
        ${messageBlock}
        <p><em>Submitted via goals.ac contact form.</em></p>
      `,
    });
  } catch {
    // DB save succeeded; email notification is best-effort.
  }

  return NextResponse.json({ ok: true });
}
