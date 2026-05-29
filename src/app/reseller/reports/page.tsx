import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { desc, eq, sql, inArray } from "drizzle-orm";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResellerReportsPage() {
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const ids = await db.select({ id: users.id }).from(users).where(sql`${users.role}='customer' and ${users.resellerId}=${reseller?.id || 0}`);
  const idList = ids.map(i => i.id);
  const reports = idList.length ? await db.query.payments.findMany({ where: inArray(payments.userId, idList), orderBy: [desc(payments.createdAt)], with: { user: true } }) : [];
  return <div className="space-y-6"><h1 className="text-2xl font-bold text-white">Recharge & Session Reports</h1><div className="glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5 flex gap-2"><FileText size={18} className="text-purple-300"/><h2 className="text-white font-semibold">Reseller Transaction Report</h2></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-sm text-gray-400 uppercase border-b border-white/10"><th className="p-4">Customer</th><th className="p-4">Amount</th><th className="p-4">Method</th><th className="p-4">Date</th></tr></thead><tbody className="divide-y divide-white/5">{reports.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">No report yet.</td></tr> : reports.map(p => <tr key={p.id}><td className="p-4 text-white">{p.user?.name}</td><td className="p-4 text-white font-bold">৳{p.amount}</td><td className="p-4 text-gray-300">{p.method}</td><td className="p-4 text-gray-400">{p.createdAt?.toLocaleDateString()}</td></tr>)}</tbody></table></div></div></div>;
}
