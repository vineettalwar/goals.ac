import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, setAuthCookies } from "../lib/auth";
import { createSession, REFRESH_TOKEN_TTL_MS } from "../lib/sessions";
import crypto from "crypto";

const router: IRouter = Router();

const GOOGLE_CLIENT_ID = process.env["GOOGLE_CLIENT_ID"];
const GOOGLE_CLIENT_SECRET = process.env["GOOGLE_CLIENT_SECRET"];

function getAppOrigin(): string {
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  return process.env["APP_ORIGIN"] ?? (devDomain ? `https://${devDomain}` : "https://goals.ac");
}

function getGoogleCallbackUrl(): string {
  return `${getAppOrigin()}/api/auth/google/callback`;
}

router.get("/auth/google", (_req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google OAuth is not configured" });
    return;
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/auth/google/callback", async (req, res) => {
  const appOrigin = getAppOrigin();
  const { code, error: oauthError, state } = req.query;
  const expectedState = req.cookies?.["oauth_state"];

  res.clearCookie("oauth_state");

  if (oauthError || !code || typeof code !== "string") {
    res.redirect(`${appOrigin}/login?error=oauth_failed`);
    return;
  }

  if (!state || state !== expectedState) {
    res.redirect(`${appOrigin}/login?error=oauth_failed`);
    return;
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.redirect(`${appOrigin}/login?error=oauth_failed`);
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: getGoogleCallbackUrl(),
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      req.log.error({ tokenData }, "Google token exchange failed");
      res.redirect(`${appOrigin}/login?error=oauth_failed`);
      return;
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as { id: string; email: string; name: string };

    if (!profile.id || !profile.email) {
      res.redirect(`${appOrigin}/login?error=oauth_failed`);
      return;
    }

    let user: typeof usersTable.$inferSelect;

    const [byGoogleId] = await db.select().from(usersTable).where(eq(usersTable.googleId, profile.id)).limit(1);
    if (byGoogleId) {
      user = byGoogleId;
    } else {
      const [byEmail] = await db.select().from(usersTable).where(eq(usersTable.email, profile.email)).limit(1);
      if (byEmail) {
        const [updated] = await db
          .update(usersTable)
          .set({ googleId: profile.id })
          .where(eq(usersTable.id, byEmail.id))
          .returning();
        user = updated;
      } else {
        const [created] = await db
          .insert(usersTable)
          .values({ email: profile.email, name: profile.name, googleId: profile.id })
          .returning();
        user = created;
      }
    }

    const SUPER_ADMIN_EMAIL = "vineettalwar007@gmail.com";
    if (user.email === SUPER_ADMIN_EMAIL && user.role !== "super_admin") {
      const [promoted] = await db
        .update(usersTable)
        .set({ role: "super_admin" })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = promoted;
    }

    const jwtToken = signToken({ userId: user.id, email: user.email, role: user.role });
    const { refreshToken } = await createSession(user.id, req);
    setAuthCookies(res, jwtToken, refreshToken, REFRESH_TOKEN_TTL_MS);

    const params = new URLSearchParams({
      token: jwtToken,
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    });
    res.redirect(`${appOrigin}/oauth-callback?${params}`);
  } catch (err) {
    req.log.error(err, "Google OAuth callback failed");
    res.redirect(`${appOrigin}/login?error=oauth_failed`);
  }
});

export default router;
