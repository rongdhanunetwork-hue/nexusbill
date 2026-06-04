import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { ShieldCheck, Users, UserCog, Store, Headphones, Crown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/login/superadmin");

  const [adminCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "admin"));
  const [resellerCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "reseller"));
  const [employeeCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "employee"));
  const [customerCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "customer"));

  const recentAdmins = await db.query.users.findMany({
    where: eq(users.role, "admin"),
    limit: 5,
    columns: { id: true, name: true, phone: true, status: true, createdAt: true },
  });

  const stats = [
    { label: "Total Admins", value: adminCount.count, icon: UserCog, color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.2)" },
    { label: "Total Resellers", value: resellerCount.count, icon: Store, color: "#a78bfa", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
    { label: "Total Employees", value: employeeCount.count, icon: Headphones, color: "#fb923c", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.2)" },
    { label: "Total Customers", value: customerCount.count, icon: Users, color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <Crown size={24} style={{ color: "#fbbf24" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
          <p className="text-sm text-gray-400">Full system control — {session.name}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <div className="p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Admins */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCog size={18} style={{ color: "#06b6d4" }} /> Recent Admins
          </h2>
          <a href="/superadmin/admins" className="text-xs font-semibold hover:text-white transition-colors" style={{ color: "#fbbf24" }}>
            View All →
          </a>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {recentAdmins.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-500 text-sm">No admins created yet</p>
          ) : recentAdmins.map(admin => (
            <div key={admin.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-white/3 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #1e3a5f, #06b6d4)" }}>
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{admin.name}</p>
                  <p className="text-xs text-gray-500">{admin.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${admin.status === "active" ? "text-green-400" : "text-gray-500"}`}
                  style={{ background: admin.status === "active" ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${admin.status === "active" ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.1)"}` }}>
                  {admin.status?.toUpperCase() || "ACTIVE"}
                </span>
                <a href={`/superadmin/admins/${admin.id}`} className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                  style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)" }}>
                  Manage
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <a href="/superadmin/admins/new"
          className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.01] cursor-pointer"
          style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(6,182,212,0.15)" }}>
            <UserCog size={24} style={{ color: "#06b6d4" }} />
          </div>
          <div>
            <p className="font-bold text-white">Create New Admin</p>
            <p className="text-xs text-gray-400 mt-0.5">Add a new admin to the system</p>
          </div>
        </a>
        <a href="/superadmin/users"
          className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.01] cursor-pointer"
          style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(251,191,36,0.12)" }}>
            <Users size={24} style={{ color: "#fbbf24" }} />
          </div>
          <div>
            <p className="font-bold text-white">View All Users</p>
            <p className="text-xs text-gray-400 mt-0.5">See all resellers, employees, customers</p>
          </div>
        </a>
      </div>
    </div>
  );
}
