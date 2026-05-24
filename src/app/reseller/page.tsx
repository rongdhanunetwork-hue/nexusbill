import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Wallet, Users, Wifi, WifiOff, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResellerDashboard() {
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const resellerId = reseller?.id || 0;
  const [total] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users).where(sql`${users.role}='customer' and ${users.resellerId}=${resellerId}`);
  const [active] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users).where(sql`${users.role}='customer' and ${users.resellerId}=${resellerId} and ${users.status} in ('active','online')`);
  const [offline] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users).where(sql`${users.role}='customer' and ${users.resellerId}=${resellerId} and ${users.status}='offline'`);
  const expiring = await db.query.users.findMany({ where: sql`${users.role}='customer' and ${users.resellerId}=${resellerId} and ${users.expireDate} <= now() + interval '5 days'`, limit: 6, with: { package: true } });
  const stats = [
    { label: "Wallet Balance", value: `৳${reseller?.walletBalance || "0.00"}`, icon: Wallet, color: "text-purple-300" },
    { label: "My Customers", value: total?.count || 0, icon: Users, color: "text-neon-blue" },
    { label: "Active", value: active?.count || 0, icon: Wifi, color: "text-neon-green" },
    { label: "Offline", value: offline?.count || 0, icon: WifiOff, color: "text-red-400" },
  ];
  return <div className="space-y-8"><div className="glass-card p-8 bg-gradient-to-r from-purple-500/10 to-transparent"><h1 className="text-3xl font-bold text-white mb-2">Reseller Dashboard</h1><p className="text-gray-400">Manage your own customers without MikroTik/OLT core access.</p></div><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">{stats.map(s => <div key={s.label} className="glass-card p-5"><div className={`w-12 h-12 rounded-xl bg-white/10 ${s.color} flex items-center justify-center mb-4`}><s.icon size={24}/></div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-sm text-gray-400">{s.label}</p></div>)}</div><div className="glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5 flex gap-2 items-center"><Clock size={18} className="text-orange-400"/><h2 className="font-semibold text-white">Expiring Soon Customers</h2></div><div className="divide-y divide-white/5">{expiring.length === 0 ? <div className="p-8 text-center text-gray-500">No customers expiring soon.</div> : expiring.map(c => <div key={c.id} className="p-4 flex justify-between"><div><p className="text-white font-medium">{c.name}</p><p className="text-gray-400 text-sm">{c.phone} • {c.package?.name || "No Package"}</p></div><span className="text-orange-300">{c.expireDate?.toLocaleDateString() || "N/A"}</span></div>)}</div></div></div>;
}
