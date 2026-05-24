import { db } from "@/db";
import { tickets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { LifeBuoy, CheckCircle } from "lucide-react";
export const dynamic = "force-dynamic";
async function resolveTicket(formData: FormData) { "use server"; const id = Number(formData.get("id")); if (id) await db.update(tickets).set({ status: "resolved" }).where(eq(tickets.id, id)); revalidatePath("/employee/tickets"); }
export default async function EmployeeTicketsPage() {
  const allTickets = await db.query.tickets.findMany({ orderBy: [desc(tickets.createdAt)], with: { user: true } });
  return <div className="space-y-6"><h1 className="text-2xl font-bold text-white flex gap-2"><LifeBuoy className="text-orange-300"/> Pending Complaints & Support Tickets</h1><div className="space-y-4">{allTickets.length === 0 ? <div className="glass-card p-8 text-center text-gray-500">No tickets found.</div> : allTickets.map(t => <div key={t.id} className="glass-card p-5"><div className="flex flex-col md:flex-row md:items-start justify-between gap-4"><div><h2 className="text-white font-bold">{t.subject}</h2><p className="text-gray-400 text-sm mt-1">Customer: {t.user?.name || "Unknown"} • {t.createdAt?.toLocaleDateString()}</p><p className="text-gray-300 mt-3">{t.message}</p></div><div className="shrink-0 text-right"><span className={t.status === "resolved" ? "text-neon-green" : "text-yellow-400"}>{t.status}</span>{t.status !== "resolved" && <form action={resolveTicket} className="mt-3"><input type="hidden" name="id" value={t.id}/><button className="px-3 py-2 rounded-lg bg-neon-green/20 text-neon-green border border-neon-green/30 flex items-center gap-2"><CheckCircle size={16}/> Resolve</button></form>}</div></div></div>)}</div></div>;
}
