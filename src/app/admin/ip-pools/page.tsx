import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { mikrotiks } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import IpPoolsClient from "./IpPoolsClient";

export const dynamic = "force-dynamic";

export default async function IpPoolsPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }

  const adminId = session.userId;

  const routers = await db.query.mikrotiks.findMany({
    where: and(eq(mikrotiks.adminId, adminId), isNull(mikrotiks.resellerId)),
  });

  return <IpPoolsClient routers={routers as any[]} />;
}
