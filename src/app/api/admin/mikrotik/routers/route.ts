import { NextResponse } from "next/server";
import { db } from "@/db";
import { mikrotiks, olts } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const routers = await db.query.mikrotiks.findMany();
  return NextResponse.json(routers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, ipAddress, apiPort, username, password } = body;

  if (!name || !ipAddress || !password) {
    return NextResponse.json({ error: "Name, IP, password required" }, { status: 400 });
  }

  const [router] = await db.insert(mikrotiks).values({
    name: name.trim(),
    ipAddress: ipAddress.trim(),
    apiPort: Number(apiPort) || 13065,
    username: username?.trim() || "admin",
    password: password.trim(),
    status: true,
  }).returning();

  return NextResponse.json(router, { status: 201 });
}
