import { db } from "@/db";
import { users, tickets, payments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Banknote, LifeBuoy, Wifi, Users } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function EmployeeDashboard() {
  const [todayCollection] = await db.select({ sum: sql<number>`cast(coalesce(sum(${payments.amount}),0) as int)` }).from(payments).where(sql`${payments.status}='approved' and ${payments.createdAt}::date=current_date`);
  const [pendingTickets] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(tickets).where(eq(tickets.status, "open"));
  const [liveUsers] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users).where(sql`${users.role}='customer' and ${users.status} in ('active','online')`);
  const [customers] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users).where(eq(users.role, "customer"));
  const stats = [ { label: "My Today's Collection", value: `৳${todayCollection?.sum || 0}`, icon: Banknote, color: "text-neon-green" }, { label: "Pending Complaints", value: pendingTickets?.count || 0, icon: LifeBuoy, color: "text-orange-400" }, { label: "Live Users", value: liveUsers?.count || 0, icon: Wifi, color: "text-neon-blue" }, { label: "Customer Entries", value: customers?.count || 0, icon: Users, color: "text-purple-300" } ];
  return <div className="space-y-8"><div className="glass-card p-8 bg-gradient-to-r from-orange-500/10 to-transparent"><h1 className="text-3xl font-bold text-white mb-2">Employee Dashboard</h1><p className="text-gray-400">Restricted staff module for bill collection, support and customer data entry. Company total income and core network config hidden.</p></div><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">{stats.map(s => <div key={s.label} className="glass-card p-5"><div className={`w-12 h-12 rounded-xl bg-white/10 ${s.color} flex items-center justify-center mb-4`}><s.icon size={24}/></div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-sm text-gray-400">{s.label}</p></div>)}</div></div>;
}
