import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import AuditLogsClient from "./AuditLogsClient";

export default async function AuditLogsPage() {
  const session = await getSession();
  
  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  const logs = await db.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)],
    limit: 500,
    with: {
      user: {
        columns: { name: true, role: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">System Audit Logs</h1>
        <p className="text-gray-400 mt-2">Track administrative and system actions</p>
      </div>

      <AuditLogsClient initialLogs={logs as any[]} />
    </div>
  );
}
