import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc } from "drizzle-orm";
import NoticeClient from "./NoticeClient";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const allNotices = await db.query.notices.findMany({ orderBy: [desc(notices.createdAt)] });

  return <NoticeClient notices={allNotices as any} />;
}
