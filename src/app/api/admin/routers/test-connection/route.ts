import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ipAddress, port = 80 } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: "IP address required" }, { status: 400 });
    }

    const targetPort = parseInt(port, 10) || 80;
    const targetUrl = targetPort === 443 
      ? `https://${ipAddress}:${targetPort}` 
      : `http://${ipAddress}:${targetPort}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

    try {
      const response: Response | null = await fetch(targetUrl, {
        method: "HEAD",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeout);

      const isOnline = response !== null;

      return NextResponse.json({
        online: isOnline,
        status: isOnline ? "Online / Reachable" : "Offline / Unreachable",
        url: targetUrl,
      });
    } catch (e) {
      clearTimeout(timeout);
      return NextResponse.json({
        online: false,
        status: "Offline / Unreachable",
        url: targetUrl,
      });
    }
  } catch (error) {
    console.error("Router ping test error:", error);
    return NextResponse.json({ error: "Failed to test connection" }, { status: 500 });
  }
}
