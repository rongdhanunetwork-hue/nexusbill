import { NextResponse } from "next/server";
import { RouterOSAPI } from "node-routeros";
import { db } from "@/db";
import { mikrotiks } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  let log = "";
  try {
    const routerRow = await db.query.mikrotiks.findFirst();
    if (!routerRow) return NextResponse.json({ error: "No router found" });
    
    log += `Found router ${routerRow.ipAddress}. Connecting... `;
    
    const client = new RouterOSAPI({
      host: routerRow.ipAddress,
      port: routerRow.apiPort ?? undefined,
      user: routerRow.username,
      password: routerRow.password,
      timeout: 5
    });

    await client.connect();
    log += `Connected in ${Date.now() - t0}ms. Fetching resource... `;
    
    const t1 = Date.now();
    const res = await client.write("/system/resource/print");
    log += `Got resource in ${Date.now() - t1}ms. closing... `;
    
    await client.close();
    return NextResponse.json({ success: true, log, resource: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, log, error: err.message, time: Date.now() - t0 });
  }
}
