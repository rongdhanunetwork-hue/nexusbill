import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/db";
import { users, mikrotiks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
  deletePppoeProfile,
  getPppoeActive,
  PppoeActive
} from "@/lib/mikrotik";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "employee" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      action, 
      id, 
      name, 
      password, 
      profile, 
      rateLimit, 
      localAddress, 
      remoteAddress 
    } = body;

    let routerId: number | undefined = undefined;
    if (body.routerId) {
      routerId = Number(body.routerId);
    }

    if (session.role === "reseller" && routerId) {
      // Verify ownership
      const routerObj = await db.query.mikrotiks.findFirst({
        where: and(
          eq(mikrotiks.id, routerId),
          eq(mikrotiks.resellerId, session.userId)
        )
      });
      if (!routerObj) {
        return NextResponse.json({ error: "Access denied to this router" }, { status: 403 });
      }
    }

    // Try to find the customer's assigned router if username is provided
    if (!routerId && name) {
      const customer = await db.query.users.findFirst({
        where: and(
          eq(users.role, "customer"),
          eq(users.pppoeUsername, name)
        ),
        columns: { mikrotikId: true }
      });
      if (customer?.mikrotikId) {
        routerId = customer.mikrotikId;
      }
    }

    // Fallback to first active router for the reseller/admin/employee
    if (!routerId) {
      let targetAdminId = session.userId;
      if (session.role === "reseller" || session.role === "employee") {
        const u = await db.query.users.findFirst({
          where: eq(users.id, session.userId),
          columns: { adminId: true }
        });
        targetAdminId = u?.adminId || 1;
      }
      
      const firstActiveRouter = await db.query.mikrotiks.findFirst({
        where: and(
          session.role === "reseller"
            ? eq(mikrotiks.resellerId, session.userId)
            : eq(mikrotiks.adminId, targetAdminId),
          eq(mikrotiks.status, true)
        )
      });
      if (firstActiveRouter) {
        routerId = firstActiveRouter.id;
      }
    }

    if (!routerId) {
      return NextResponse.json({ error: "No active router configured or selected." }, { status: 400 });
    }

    switch (action) {
      case "enable":
        await enablePppoeSecret(id, routerId);
        return NextResponse.json({ success: true, message: `${name || id} enabled` });

      case "disable":
        await disablePppoeSecret(id, routerId);
        return NextResponse.json({ success: true, message: `${name || id} disabled` });

      case "create":
        if (!name || !password) {
          return NextResponse.json({ error: "Name and password required" }, { status: 400 });
        }
        const created = await createPppoeSecret({ name, password, profile: profile || "default" }, routerId);
        return NextResponse.json({ success: true, user: created });

      case "edit":
        if (!id) {
          return NextResponse.json({ error: "Secret ID required" }, { status: 400 });
        }
        await updatePppoeSecret(id, { name, password, profile }, routerId);
        return NextResponse.json({ success: true, message: `PPPoE user ${name} updated successfully` });

      case "delete":
        {
          const hasPerm = await hasPermission(session.userId, "Mikrotik Delete");
          if (!hasPerm) {
            return NextResponse.json({ error: "Access Denied: You do not have 'Mikrotik Delete' permission" }, { status: 403 });
          }
          await deletePppoeSecret(id, routerId);
          return NextResponse.json({ success: true, message: `${name || id} deleted` });
        }

      case "disconnect":
        if (!id && !name) {
          return NextResponse.json({ error: "Active session ID or name required" }, { status: 400 });
        }
        let sessionToKick = id;
        if (!sessionToKick && name) {
          const activeSessions = await getPppoeActive(routerId);
          const found = activeSessions.find((s: PppoeActive) => s.name.toLowerCase() === name.toLowerCase());
          if (found) {
            sessionToKick = found[".id"];
          }
        }
        if (!sessionToKick) {
          return NextResponse.json({ error: "No active session found for this customer" }, { status: 404 });
        }
        await disconnectPppoeActive(sessionToKick, routerId);
        return NextResponse.json({ success: true, message: `Active session for ${name || id} disconnected` });

      case "reboot":
        await rebootRouter(routerId);
        return NextResponse.json({ success: true, message: "Router reboot command sent successfully. Router will restart." });

      case "createProfile":
        if (!name) {
          return NextResponse.json({ error: "Profile name required" }, { status: 400 });
        }
        const createdProf = await createPppoeProfile({ name, rateLimit, localAddress, remoteAddress }, routerId);
        return NextResponse.json({ success: true, profile: createdProf });

      case "editProfile":
        if (!id) {
          return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
        }
        await updatePppoeProfile(id, { name, rateLimit, localAddress, remoteAddress }, routerId);
        return NextResponse.json({ success: true, message: `Profile ${name} updated successfully` });

      case "deleteProfile":
        if (!id) {
          return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
        }
        {
          const hasPerm = await hasPermission(session.userId, "Mikrotik Delete");
          if (!hasPerm) {
            return NextResponse.json({ error: "Access Denied: You do not have 'Mikrotik Delete' permission" }, { status: 403 });
          }
          await deletePppoeProfile(id, routerId);
          return NextResponse.json({ success: true, message: `Profile deleted successfully` });
        }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("MikroTik toggle error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
