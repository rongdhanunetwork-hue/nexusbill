import { db } from "@/db";
import { packages, mikrotiks, users, hotspotVouchers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import HotspotClient from "./HotspotClient";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HotspotPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }

  const allPackages = await db.query.packages.findMany();
  const allRouters = await db.query.mikrotiks.findMany({ where: eq(mikrotiks.status, true) });
  const allVouchers = await db.query.hotspotVouchers.findMany({
    orderBy: [desc(hotspotVouchers.createdAt)],
    limit: 500
  });

  return (
    <HotspotClient 
      packages={allPackages} 
      routers={allRouters} 
      vouchers={allVouchers} 
      adminId={Number(session.userId)} 
    />
  );
}
