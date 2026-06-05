import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notices, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Megaphone, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerNoticesPage() {
  const session = await getSession();
  if (!session || session.role !== "customer") redirect("/login/customer");

  const customer = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { adminId: true }
  });
  const adminId = customer?.adminId || 1;

  const allNotices = await db.query.notices.findMany({
    where: eq(notices.adminId, adminId),
    orderBy: [desc(notices.createdAt)],
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-neon-blue/20 rounded-xl text-neon-blue border border-neon-blue/20">
          <Megaphone size={24} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Notices & Offers</h1>
      </div>

      <div className="space-y-6">
        {allNotices.length === 0 ? (
          <div className="glass-card p-10 text-center text-gray-400 font-semibold">
            No notices available at the moment.
          </div>
        ) : (
          allNotices.map((notice) => (
            <div key={notice.id} className="glass-card p-6 sm:p-8 overflow-hidden relative">
              {/* If there's an image */}
              {notice.imageUrl && (
                <div className="w-full h-48 sm:h-72 relative bg-black/50 border border-white/10 rounded-xl mb-6 overflow-hidden shadow-lg">
                  <img 
                    src={notice.imageUrl} 
                    alt={notice.title} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                  />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{notice.title}</h2>
                <span className="text-xs font-semibold text-neon-blue flex items-center gap-1.5 shrink-0 bg-neon-blue/10 px-3 py-1.5 rounded-lg border border-neon-blue/20">
                  <Calendar size={14} /> 
                  {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                {notice.message || "No additional details available."}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
