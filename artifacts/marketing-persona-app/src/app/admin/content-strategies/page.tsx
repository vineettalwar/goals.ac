import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { AdminContentStrategiesClient } from "./admin-client";

export default async function AdminContentStrategiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, parseInt(session.user.id, 10)))
    .limit(1);

  if (user?.role !== "admin" && user?.role !== "super_admin") redirect("/dashboard");

  return <AdminContentStrategiesClient />;
}
