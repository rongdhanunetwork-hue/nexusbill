import { NextRequest, NextResponse } from "next/server";
import { checkAndSuspendExpiredUsers, trackCustomerDataUsage } from "@/lib/sync";

const CRON_SECRET = process.env.CRON_SECRET || "isp-cron-secret-2024";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await checkAndSuspendExpiredUsers();
    await trackCustomerDataUsage();
    
    // Call FUP check internally to save Vercel cron limits
    const baseUrl = req.nextUrl.origin;
    fetch(`${baseUrl}/api/cron/fup-check?secret=isp-cron-secret-2024`).catch(e => console.error("FUP error:", e));

    return NextResponse.json({ success: true, message: "Sync enforcer executed successfully." });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
