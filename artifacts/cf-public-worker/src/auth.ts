import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { GoalsD1Database } from "@workspace/db/d1";
import { usersTable } from "@workspace/db/schema-sqlite";
import {
  buildSessionCookie,
  clearSessionCookie,
  requestUsesSecureCookies,
} from "@workspace/cf-edge/session-cookie";

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

type AuthEnv = { AUTH_SECRET?: string };

function jsonWithCookie(body: unknown, cookie: string, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}

function requireSecret(env: AuthEnv): string | null {
  const secret = env.AUTH_SECRET?.trim();
  return secret || null;
}

export async function handleAuthLogin(
  request: Request,
  env: AuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const secret = requireSecret(env);
  if (!secret) {
    return Response.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const parsed = loginBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const [user] = await database
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      passwordHash: usersTable.passwordHash,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user?.passwordHash) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const secure = requestUsesSecureCookies(request);
  const cookie = await buildSessionCookie(
    {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    secure,
  );

  return jsonWithCookie(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: null,
      },
    },
    cookie,
  );
}

export async function handleAuthSignup(
  request: Request,
  env: AuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const secret = requireSecret(env);
  if (!secret) {
    return Response.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const parsed = signupBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request";
    return Response.json({ error: message }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const [existing] = await database
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    return Response.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [user] = await database
    .insert(usersTable)
    .values({
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      role: "user",
    })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
    });

  const secure = requestUsesSecureCookies(request);
  const cookie = await buildSessionCookie(
    {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    secure,
  );

  return jsonWithCookie(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: null,
      },
    },
    cookie,
    201,
  );
}

export function handleAuthLogout(request: Request): Response {
  const secure = requestUsesSecureCookies(request);
  return jsonWithCookie({ ok: true }, clearSessionCookie(secure));
}
