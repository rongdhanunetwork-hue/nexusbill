import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { BarChart3, Users, ShieldAlert, BadgeCheck, CircleDollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminStatsPage() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/login/superadmin");

  // Get count breakdown by role
  const rolesBreakdown = await db.select({
    role: users.role,
    count: count()
  }).from(users).groupBy(users.role);

  // Get status breakdown
  const statusBreakdown = await db.select({
    status: users.status,
    count: count()
  }).from(users).groupBy(users.status);

  // Get total reseller wallet balance sum
  const [walletSum] = await db.select({
    total: sql<string>`sum(${users.walletBalance})`
  }).from(users).where(eq(users.role, "reseller"));

  const statsMap = new Map(rolesBreakdown.map(r => [r.role, r.count]));
  const statusMap = new Map(statusBreakdown.map(s => [s.status || "active", s.count]));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <BarChart3 size={24} style={{ color: "#fbbf24" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">System Statistics</h1>
          <p className="text-sm text-gray-400">Detailed overview of all accounts and status metrics</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Role Breakdown Card */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-blue-400" /> Account Types
          </h2>
          <div className="space-y-3">
            {[
              { label: "Super Admins", count: statsMap.get("superadmin") || 0, color: "#fbbf24" },
              { label: "Admins", count: statsMap.get("admin") || 0, color: "#06b6d4" },
              { label: "Resellers", count: statsMap.get("reseller") || 0, color: "#a78bfa" },
              { label: "Employees", count: statsMap.get("employee") || 0, color: "#fb923c" },
              { label: "Customers", count: statsMap.get("customer") || 0, color: "#34d399" },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-gray-400 font-medium">{item.label}</span>
                <span className="text-sm font-bold text-white font-mono px-3 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Breakdown & Financials */}
        <div className="space-y-5">
          {/* Status Breakdown */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BadgeCheck size={18} className="text-green-400" /> Account Status
            </h2>
            <div className="space-y-3">
              {[
                { label: "Active", count: statusMap.get("active") || 0, color: "#34d399" },
                { label: "Expired", count: statusMap.get("expired") || 0, color: "#fb923c" },
                { label: "Suspended", count: statusMap.get("suspended") || 0, color: "#f87171" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-400 font-medium">{item.label}</span>
                  <span className="text-sm font-bold font-mono" style={{ color: item.color }}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial summary */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CircleDollarSign size={18} className="text-yellow-400" /> Reseller Finances
            </h2>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-400 font-medium">Total Reseller Credits</span>
              <span className="text-lg font-bold text-yellow-500 font-mono">
                ৳{parseFloat(walletSum?.total || "0").toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
