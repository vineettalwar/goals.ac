import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth";
import { sendEmail, buildPasswordResetEmail } from "../services/emailService";
import crypto from "crypto";

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
      .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name });

    const token = signToken({ userId: user.id, email: user.email });

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
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

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    req.log.error(err, "Failed to log in user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error(err, "Failed to fetch user");
    res.status(500).json({ error: "Internal server error" });
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

    const devDomain = process.env["REPLIT_DEV_DOMAIN"];
    const appOrigin = process.env["APP_ORIGIN"] ?? (devDomain ? `https://${devDomain}` : "https://goals.ac");
    const resetUrl = `${appOrigin}/reset-password?token=${rawToken}`;

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
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(usersTable.id, user.id));

    const jwtToken = signToken({ userId: user.id, email: user.email });

    res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    req.log.error(err, "Failed to reset password");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
