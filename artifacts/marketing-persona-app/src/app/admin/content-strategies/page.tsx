import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@workspace/db";
import { contentStrategiesTable, usersTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function AdminContentStrategiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, parseInt(session.user.id, 10)))
    .limit(1);

  if (user?.role !== "admin") redirect("/dashboard");

  const strategies = await db
    .select()
    .from(contentStrategiesTable)
    .orderBy(desc(contentStrategiesTable.createdAt))
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin: Content Strategies</h1>
          <p className="text-sm text-muted-foreground mt-1">{strategies.length} strategies total</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
      </div>

      <div className="paper-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-[--border]">
            <tr>
              {["ID", "Roadmap", "Project", "Industry", "Period", "Stage", "Created"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[--border]">
            {strategies.map((s) => (
              <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{s.id}</td>
                <td className="px-4 py-3">{s.roadmapId}</td>
                <td className="px-4 py-3">{s.websiteProjectId ?? "—"}</td>
                <td className="px-4 py-3">{s.industry}</td>
                <td className="px-4 py-3">{MONTH_NAMES[(s.month ?? 1) - 1]} {s.year}</td>
                <td className="px-4 py-3">{s.stage}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {strategies.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No strategies yet.</div>
        )}
      </div>
    </div>
  );
}
