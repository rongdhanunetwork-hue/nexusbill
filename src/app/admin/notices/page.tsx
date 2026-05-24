import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Megaphone, Wrench, Gift, Send } from "lucide-react";

export const dynamic = "force-dynamic";

async function createNotice(formData: FormData) {
  "use server";
  const title = String(formData.get("title") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const type = String(formData.get("type") || "general");
  if (title && message) {
    await db.insert(notices).values({ title, message, type });
  }
  redirect("/admin/notices");
}

export default async function NoticesPage() {
  const allNotices = await db.query.notices.findMany({ orderBy: [desc(notices.createdAt)] });

  const iconForType = (type: string | null) => {
    if (type === "offer") return <Gift size={18} className="text-neon-green" />;
    if (type === "maintenance") return <Wrench size={18} className="text-orange-400" />;
    return <Megaphone size={18} className="text-neon-blue" />;
  };

  return (
    <div className="grid xl:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Notice System</h1>
        <form action={createNotice} className="glass-card p-6 md:p-8 space-y-5">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Notice Type</label>
            <select name="type" className="w-full glass-input px-4 py-3 bg-slate-800">
              <option value="general" className="bg-slate-800">Send Notice</option>
              <option value="offer" className="bg-slate-800">Offer Banner</option>
              <option value="maintenance" className="bg-slate-800">Maintenance Notice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Title</label>
            <input name="title" required className="w-full glass-input px-4 py-3 bg-slate-800" placeholder="e.g. Eid Offer / Maintenance Tonight" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Message</label>
            <textarea name="message" required rows={6} className="w-full glass-input px-4 py-3 bg-slate-800 resize-none" placeholder="Write your notice message..." />
          </div>
          <button className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold flex items-center justify-center gap-2 hover:bg-neon-blue/30">
            <Send size={18} /> Publish Notice
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white tracking-wide">Published Notices</h2>
        <div className="space-y-4">
          {allNotices.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">No notices published yet.</div>
          ) : allNotices.map((notice) => (
            <div key={notice.id} className="glass-card p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/10 rounded-lg">{iconForType(notice.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h3 className="font-bold text-white">{notice.title}</h3>
                    <span className="text-xs text-gray-500 capitalize">{notice.type}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{notice.message}</p>
                  <p className="text-xs text-gray-500 mt-3">{notice.createdAt?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
