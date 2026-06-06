import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSystemResource } from "@/lib/mikrotik";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const routerId = Number(id);
  if (!routerId) return NextResponse.json({ error: "Invalid router ID" }, { status: 400 });

  try {
    const sys = await getSystemResource(routerId);
    if (!sys) return NextResponse.json({ error: "Router not reachable" }, { status: 502 });
    return NextResponse.json({ boardName: sys["board-name"] || null, version: sys.version || null });
  } catch (err) {
    return NextResponse.json({ error: "Failed to query router" }, { status: 500 });
  }
}
