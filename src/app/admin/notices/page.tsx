import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import NoticeClient from "./NoticeClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const allNotices = await db.query.notices.findMany({
    where: eq(notices.adminId, session.userId),
    orderBy: [desc(notices.createdAt)]
  });

  return <NoticeClient notices={allNotices as any} />;
}
