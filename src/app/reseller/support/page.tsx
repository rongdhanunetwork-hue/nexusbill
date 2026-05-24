import { db } from "@/db";
import { tickets, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Send, LifeBuoy } from "lucide-react";
export const dynamic = "force-dynamic";
async function createTicket(formData: FormData) { "use server"; const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") }); if (!reseller) return; await db.insert(tickets).values({ userId: reseller.id, subject: String(formData.get("subject") || "Reseller Support"), message: String(formData.get("message") || ""), status: "open" }); revalidatePath("/reseller/support"); }
export default async function ResellerSupportPage() {
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const myTickets = reseller ? await db.query.tickets.findMany({ where: eq(tickets.userId, reseller.id), orderBy: [desc(tickets.createdAt)] }) : [];
  return <div className="grid lg:grid-cols-2 gap-8"><form action={createTicket} className="glass-card p-6 space-y-5"><h1 className="text-2xl font-bold text-white flex gap-2"><LifeBuoy className="text-purple-300"/> Admin Support Ticket</h1><input name="subject" required placeholder="Technical issue subject" className="w-full glass-input px-4 py-3 bg-slate-800"/><textarea name="message" required rows={6} placeholder="Describe your issue..." className="w-full glass-input px-4 py-3 bg-slate-800"/><button className="w-full py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 font-semibold flex justify-center gap-2"><Send size={18}/> Send Ticket</button></form><div className="space-y-4"><h2 className="text-xl font-bold text-white">My Tickets</h2>{myTickets.length === 0 ? <div className="glass-card p-8 text-gray-500 text-center">No tickets yet.</div> : myTickets.map(t => <div key={t.id} className="glass-card p-5"><div className="flex justify-between"><h3 className="text-white font-bold">{t.subject}</h3><span className="text-xs text-yellow-400">{t.status}</span></div><p className="text-gray-400 text-sm mt-2">{t.message}</p></div>)}</div></div>;
}
