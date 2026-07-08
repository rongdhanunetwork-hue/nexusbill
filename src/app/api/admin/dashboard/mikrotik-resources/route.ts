export const maxDuration = 60;
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/db";
import { mikrotiks } from "@/db/schema";
import { getSystemResource } from "@/lib/mikrotik";
import { getSession } from "@/lib/auth";
import { eq, isNull, and } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminId = session.role === 'admin' ? session.userId : (session as any).adminId || session.userId;

  try {
    const routers = await db.query.mikrotiks.findMany({
      where: session.role === "admin" 
        ? and(eq(mikrotiks.adminId, adminId), isNull(mikrotiks.resellerId))
        : eq(mikrotiks.adminId, adminId)
    });

    const resources = await Promise.all(
      routers.map(async (r) => {
        try {
          const res = await getSystemResource(r.id);
          return { routerId: r.id, name: r.name, ip: r.ipAddress, resource: res };
        } catch (err) {
          return { routerId: r.id, name: r.name, ip: r.ipAddress, error: "Offline" };
        }
      })
    );

    return NextResponse.json(resources);
  } catch (error: any) {
    console.error("Failed to fetch mikrotik resources:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

// force reload

// force reload 2
