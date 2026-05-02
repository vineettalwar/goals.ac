import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, websiteProjectsTable, contentStrategiesTable, contentItemsTable, seoArticlesTable, geoAuditsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth";
import { sendEmail, buildPasswordResetEmail } from "../services/emailService";
import { encryptApiKey, decryptApiKey } from "../lib/encryption";
import { createUserGeminiClient } from "../lib/geminiClient";
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

const SignupBody = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginBody = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const ForgotPasswordBody = z.object({
  email: z.string().email("Invalid email address"),
});

const ResetPasswordBody = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({ name, email, passwordHash })
      .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    req.log.error(err, "Failed to sign up user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    req.log.error(err, "Failed to log in user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      hasPassword: !!user.passwordHash,
      hasGoogleId: !!user.googleId,
      hasGeminiKey: !!user.encryptedGeminiKey,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch user");
    res.status(500).json({ error: "Internal server error" });
  }
});

const UpdateProfileBody = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  avatarUrl: z.string().url("Must be a valid URL").nullable().optional(),
});

router.patch("/auth/me", requireAuth, async (req, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const updates: Record<string, unknown> = { name: parsed.data.name };
  if (parsed.data.avatarUrl !== undefined) {
    updates.avatarUrl = parsed.data.avatarUrl;
  }

  try {
    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, req.user!.userId))
      .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, avatarUrl: usersTable.avatarUrl });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

    if (!user || !user.passwordHash) {
      res.status(400).json({ error: "Password change is not available for this account" });
      return;
    }

    const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to change password");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/auth/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  try {
    await db.transaction(async (tx) => {
      const userProjects = await tx
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.userId, userId));

      if (userProjects.length > 0) {
        const projectIds = userProjects.map((p) => p.id);

        const strategies = await tx
          .select({ id: contentStrategiesTable.id })
          .from(contentStrategiesTable)
          .where(inArray(contentStrategiesTable.websiteProjectId, projectIds));

        if (strategies.length > 0) {
          const strategyIds = strategies.map((s) => s.id);
          await tx.delete(contentItemsTable).where(inArray(contentItemsTable.strategyId, strategyIds));
        }

        await tx.delete(contentStrategiesTable).where(inArray(contentStrategiesTable.websiteProjectId, projectIds));
        await tx.delete(seoArticlesTable).where(inArray(seoArticlesTable.websiteProjectId, projectIds));
        await tx.delete(geoAuditsTable).where(inArray(geoAuditsTable.websiteProjectId, projectIds));
      }

      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to delete account");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/api-key", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.encryptedGeminiKey) {
      res.json({ hasKey: false });
      return;
    }

    let lastFour = "••••";
    try {
      const decrypted = decryptApiKey(user.encryptedGeminiKey);
      lastFour = decrypted.slice(-4);
    } catch {
      // if decryption fails, just show placeholder
    }

    res.json({ hasKey: true, lastFour });
  } catch (err) {
    req.log.error(err, "Failed to fetch API key status");
    res.status(500).json({ error: "Internal server error" });
  }
});

const ApiKeyBody = z.object({
  key: z.string().min(10, "API key is too short"),
});

router.post("/auth/api-key/test", requireAuth, async (req, res) => {
  const parsed = ApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  try {
    const client = await createUserGeminiClient(parsed.data.key);
    await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }],
      config: { maxOutputTokens: 16, thinkingConfig: { thinkingBudget: 0 } },
    });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.json({ ok: false, error: msg });
  }
});

router.patch("/auth/api-key", requireAuth, async (req, res) => {
  const parsed = ApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  try {
    const encrypted = encryptApiKey(parsed.data.key);
    await db.update(usersTable).set({ encryptedGeminiKey: encrypted }).where(eq(usersTable.id, req.user!.userId));
    const lastFour = parsed.data.key.slice(-4);
    res.json({ ok: true, hasKey: true, lastFour });
  } catch (err) {
    req.log.error(err, "Failed to save API key");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/auth/api-key", requireAuth, async (req, res) => {
  try {
    await db.update(usersTable).set({ encryptedGeminiKey: null }).where(eq(usersTable.id, req.user!.userId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to remove API key");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/google", (req, res) => {
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

router.post("/auth/forgot-password", async (req, res) => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { email } = parsed.data;

  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      res.json({ ok: true });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await db
      .update(usersTable)
      .set({ passwordResetToken: tokenHash, passwordResetExpires: resetExpires })
      .where(eq(usersTable.id, user.id));

    const resetUrl = `${getAppOrigin()}/reset-password?token=${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your goals.ac password",
        html: buildPasswordResetEmail({ name: user.name, resetUrl }),
      });
    } catch (emailErr) {
      req.log.error(emailErr, "Failed to send password reset email");
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to process forgot-password");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { token, password } = parsed.data;

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.passwordResetToken, tokenHash))
      .limit(1);

    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
      return;
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      res.status(400).json({ error: "This reset link has expired. Please request a new one." });
      return;
    }

    const passwordHash = await hashPassword(password);

    await db
      .update(usersTable)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpires: null })
      .where(eq(usersTable.id, user.id));

    const jwtToken = signToken({ userId: user.id, email: user.email, role: user.role });

    res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    req.log.error(err, "Failed to reset password");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
