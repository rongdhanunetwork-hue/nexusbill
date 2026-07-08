import { NextResponse } from "next/server";
import { getSystemResource } from "@/lib/mikrotik";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  try {
    const routerRow = await db.query.mikrotiks.findFirst();
    if (!routerRow) return NextResponse.json({ error: "No router found" });
    
    const res = await getSystemResource(routerRow.id);
    return NextResponse.json({ success: !!res, resource: res, time: Date.now() - t0 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, time: Date.now() - t0 });
  }
}
