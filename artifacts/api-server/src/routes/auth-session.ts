import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, websiteProjectsTable, contentStrategiesTable, contentItemsTable, seoArticlesTable, geoAuditsTable, competitorAnalysesTable, keywordAnalysesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, comparePassword, signToken, requireAuth, setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from "../lib/auth";
import { createSession, rotateSession, revokeAllUserSessions, revokeSessionByRefreshToken, REFRESH_TOKEN_TTL_MS } from "../lib/sessions";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { hostRasterFeaturedDataUri, isContentMediaHostConfigured } from "@workspace/media";

const router: IRouter = Router();

const SignupBody = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginBody = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
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
    const { refreshToken } = await createSession(user.id, req);
    setAuthCookies(res, token, refreshToken, REFRESH_TOKEN_TTL_MS);

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
    const { refreshToken } = await createSession(user.id, req);
    setAuthCookies(res, token, refreshToken, REFRESH_TOKEN_TTL_MS);

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

    const orgSettings = await getOrgAiSettingsForUser(user.id);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      hasPassword: !!user.passwordHash,
      hasGoogleId: !!user.googleId,
      hasGeminiKey: Boolean(orgSettings?.encryptedGeminiKey),
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch user");
    res.status(500).json({ error: "Internal server error" });
  }
});

const UpdateProfileBody = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  avatarUrl: z
    .union([
      z.literal(""),
      z.null(),
      z
        .string()
        .max(120_000)
        .refine(
          (v) =>
            v.startsWith("data:image/jpeg;base64,") ||
            v.startsWith("data:image/jpg;base64,") ||
            v.startsWith("data:image/png;base64,") ||
            /^https:\/\//i.test(v),
          "Avatar must be an uploaded image or HTTPS URL",
        ),
    ])
    .optional(),
});

async function resolveAvatarForStorage(
  raw: string | null | undefined,
  userId: number,
): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  if (raw === undefined) return { ok: true, url: null };
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return { ok: true, url: null };
  if (/^https:\/\//i.test(trimmed)) return { ok: true, url: trimmed };
  if (!trimmed.startsWith("data:image/")) return { ok: false, error: "Invalid avatar image" };
  if (!isContentMediaHostConfigured()) {
    return { ok: false, error: "Avatar uploads need content media (R2) configured" };
  }
  const hosted = await hostRasterFeaturedDataUri(trimmed, {
    scope: `avatars/${userId}`,
    filenameBase: "avatar",
  });
  if (!hosted) return { ok: false, error: "Could not upload avatar to storage" };
  return { ok: true, url: hosted };
}

router.patch("/auth/me", requireAuth, async (req, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const updates: Record<string, unknown> = { name: parsed.data.name };
  if (parsed.data.avatarUrl !== undefined) {
    const resolved = await resolveAvatarForStorage(parsed.data.avatarUrl, req.user!.userId);
    if (!resolved.ok) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    updates.avatarUrl = resolved.url;
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

    // Password changed: kill every other session, then re-establish one for
    // the request that just proved it knows the new password.
    await revokeAllUserSessions(user.id);
    const freshAccessToken = signToken({ userId: user.id, email: user.email, role: user.role });
    const { refreshToken } = await createSession(user.id, req);
    setAuthCookies(res, freshAccessToken, refreshToken, REFRESH_TOKEN_TTL_MS);

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
        await tx.delete(competitorAnalysesTable).where(inArray(competitorAnalysesTable.websiteProjectId, projectIds));
        await tx.delete(keywordAnalysesTable).where(inArray(keywordAnalysesTable.websiteProjectId, projectIds));
      }

      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to delete account");
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/auth/refresh", async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

  if (!rawToken || typeof rawToken !== "string") {
    res.status(401).json({ error: "No active session" });
    return;
  }

  try {
    const result = await rotateSession(rawToken, req);

    if (result.status !== "ok") {
      clearAuthCookies(res);
      res.status(401).json({ error: "Session expired or revoked. Please log in again." });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, result.userId))
      .limit(1);

    if (!user) {
      clearAuthCookies(res);
      res.status(401).json({ error: "Session expired or revoked. Please log in again." });
      return;
    }

    const accessToken = signToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookies(res, accessToken, result.refreshToken, REFRESH_TOKEN_TTL_MS);

    res.json({ token: accessToken, user });
  } catch (err) {
    req.log.error(err, "Failed to refresh session");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

  try {
    if (rawToken && typeof rawToken === "string") {
      await revokeSessionByRefreshToken(rawToken);
    }
  } catch (err) {
    req.log.error(err, "Failed to revoke session on logout");
  }

  clearAuthCookies(res);
  res.status(204).end();
});

export default router;
