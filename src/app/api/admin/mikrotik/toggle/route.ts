import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { 
  enablePppoeSecret, 
  disablePppoeSecret, 
  createPppoeSecret, 
  deletePppoeSecret,
  updatePppoeSecret,
  disconnectPppoeActive,
  rebootRouter,
  createPppoeProfile,
  updatePppoeProfile,
  deletePppoeProfile
} from "@/lib/mikrotik";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      action, 
      id, 
      name, 
      password, 
      profile, 
      rateLimit, 
      localAddress, 
      remoteAddress 
    } = await req.json();

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

      case "edit":
        if (!id) {
          return NextResponse.json({ error: "Secret ID required" }, { status: 400 });
        }
        await updatePppoeSecret(id, { name, password, profile });
        return NextResponse.json({ success: true, message: `PPPoE user ${name} updated successfully` });

      case "delete":
        await deletePppoeSecret(id);
        return NextResponse.json({ success: true, message: `${name || id} deleted` });

      case "disconnect":
        if (!id) {
          return NextResponse.json({ error: "Active session ID required" }, { status: 400 });
        }
        await disconnectPppoeActive(id);
        return NextResponse.json({ success: true, message: `Active session for ${name || id} disconnected` });

      case "reboot":
        await rebootRouter();
        return NextResponse.json({ success: true, message: "Router reboot command sent successfully. Router will restart." });

      case "createProfile":
        if (!name) {
          return NextResponse.json({ error: "Profile name required" }, { status: 400 });
        }
        const createdProf = await createPppoeProfile({ name, rateLimit, localAddress, remoteAddress });
        return NextResponse.json({ success: true, profile: createdProf });

      case "editProfile":
        if (!id) {
          return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
        }
        await updatePppoeProfile(id, { name, rateLimit, localAddress, remoteAddress });
        return NextResponse.json({ success: true, message: `Profile ${name} updated successfully` });

      case "deleteProfile":
        if (!id) {
          return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
        }
        await deletePppoeProfile(id);
        return NextResponse.json({ success: true, message: `Profile deleted successfully` });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("MikroTik toggle error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
