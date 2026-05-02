const RESEND_API_KEY = process.env["RESEND_API_KEY"];
const FROM_EMAIL = process.env["RESEND_FROM_EMAIL"] ?? "noreply@goals.ac";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured. Password reset emails cannot be sent.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

export function buildPasswordResetEmail(opts: { name: string; resetUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#080c1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080c1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
          <tr>
            <td style="padding:40px 40px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:22px;font-weight:700;color:#818cf8;letter-spacing:-0.5px;">goals.ac</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#f1f5f9;letter-spacing:-0.5px;">Reset your password</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#94a3b8;">
                Hi ${opts.name}, we received a request to reset the password for your goals.ac account.
                Click the button below to set a new password. This link expires in <strong style="color:#e2e8f0;">1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                    <a href="${opts.resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Or copy and paste this URL into your browser:</p>
              <p style="margin:0;font-size:12px;color:#6366f1;word-break:break-all;">${opts.resetUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email — your password won't change.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
