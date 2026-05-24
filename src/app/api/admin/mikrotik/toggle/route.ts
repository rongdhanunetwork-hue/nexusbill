import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enablePppoeSecret, disablePppoeSecret, createPppoeSecret, deletePppoeSecret } from "@/lib/mikrotik";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, id, name, password, profile } = await req.json();

    switch (action) {
      case "enable":
        await enablePppoeSecret(id);
        return NextResponse.json({ success: true, message: `${name || id} enabled` });

      case "disable":
        await disablePppoeSecret(id);
        return NextResponse.json({ success: true, message: `${name || id} disabled` });

      case "create":
        if (!name || !password) {
          return NextResponse.json({ error: "Name and password required" }, { status: 400 });
        }
        const created = await createPppoeSecret({ name, password, profile: profile || "default" });
        return NextResponse.json({ success: true, user: created });

      case "delete":
        await deletePppoeSecret(id);
        return NextResponse.json({ success: true, message: `${name || id} deleted` });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("MikroTik toggle error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
