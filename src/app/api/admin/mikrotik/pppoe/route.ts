import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPppoeSecrets, getPppoeActive, testConnection } from "@/lib/mikrotik";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [secrets, active, status] = await Promise.allSettled([
      getPppoeSecrets(),
      getPppoeActive(),
      testConnection(),
    ]);

    return NextResponse.json({
      secrets: secrets.status === "fulfilled" ? secrets.value : [],
      active: active.status === "fulfilled" ? active.value : [],
      routerStatus: status.status === "fulfilled" ? status.value : { ok: false, error: "Connection failed" },
      error: secrets.status === "rejected" ? String(secrets.reason) : null,
    });
  } catch (err) {
    return NextResponse.json({
      secrets: [],
      active: [],
      routerStatus: { ok: false, error: String(err) },
      error: String(err),
    });
  }
}
