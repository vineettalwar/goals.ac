import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  usersTable,
  websiteProjectsTable,
  organizationMembersTable,
  organizationsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId!))
    .limit(1);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const projects = await db
    .select({
      id: websiteProjectsTable.id,
      name: websiteProjectsTable.name,
      url: websiteProjectsTable.url,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId!));

  const memberships = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      role: organizationMembersTable.role,
      organizationName: organizationsTable.name,
    })
    .from(organizationMembersTable)
    .innerJoin(
      organizationsTable,
      eq(organizationsTable.id, organizationMembersTable.organizationId),
    )
    .where(eq(organizationMembersTable.userId, userId!));

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user,
    projects,
    organizations: memberships,
  });
}
