import { db } from "@/db";
import { notices, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Megaphone, Wrench, Gift } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EmployeeNoticesPage() {
  const session = await getSession();
  if (!session || session.role !== "employee") redirect("/login");

  const employee = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { adminId: true }
  });
  const adminId = employee?.adminId || 1;

  const allNotices = await db.query.notices.findMany({
    where: eq(notices.adminId, adminId),
    orderBy: [desc(notices.createdAt)]
  });

  const iconForType = (type: string | null) => {
    if (type === "offer") return <Gift size={18} className="text-orange-350" />;
    if (type === "maintenance") return <Wrench size={18} className="text-orange-400" />;
    return <Megaphone size={18} className="text-orange-400" />;
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-wide">Notice Board</h1>
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
  );
}
