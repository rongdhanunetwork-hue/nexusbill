import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRouterDetails } from "@/lib/mikrotik";
import { syncMikrotikSecrets } from "@/lib/sync";
import { db } from "@/db";
import { users, mikrotiks } from "@/db/schema";
import { inArray, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("routerId") || searchParams.get("id");
    let routerId: number | undefined = undefined;

    if (session.role === "reseller") {
      if (queryId) {
        // Verify this router belongs to the reseller
        const routerObj = await db.query.mikrotiks.findFirst({
          where: and(
            eq(mikrotiks.id, Number(queryId)),
            eq(mikrotiks.resellerId, session.userId)
          )
        });
        if (!routerObj) {
          return NextResponse.json({ error: "Access denied to this router" }, { status: 403 });
        }
        routerId = routerObj.id;
      } else {
        // Fall back to reseller's mikrotikId
        const resellerUser = await db.query.users.findFirst({
          where: eq(users.id, session.userId),
          columns: { mikrotikId: true }
        });
        if (resellerUser?.mikrotikId) {
          routerId = resellerUser.mikrotikId;
        } else {
          // Find first router registered by this reseller
          const firstRouter = await db.query.mikrotiks.findFirst({
            where: eq(mikrotiks.resellerId, session.userId),
          });
          if (firstRouter) {
            routerId = firstRouter.id;
            // Update profile
            await db.update(users).set({ mikrotikId: routerId }).where(eq(users.id, session.userId));
          }
        }
      }
    } else {
      if (queryId) {
        routerId = Number(queryId);
      }
    }

    if (session.role === "reseller" && !routerId) {
      return NextResponse.json({
        secrets: [],
        active: [],
        routerStatus: { ok: false, error: "No router configured. Please add a router in 'Routers List' first." },
        profiles: [],
        error: "No router configured",
      });
    }

    // Fetch all router details using a SINGLE connection sequentially
    const details = await getRouterDetails(routerId);

    // Automatically import any new router secrets into database using the fetched secrets (no extra connection)
    if (details.secrets && details.secrets.length > 0) {
      await syncMikrotikSecrets(details.secrets);
    }

    // Update lastSeen for online users in DB
    if (details.active && details.active.length > 0) {
      const activeNames = details.active.map((a: any) => a.name).filter(Boolean);
      const allSearchNames = [...new Set([...activeNames, ...activeNames.map((n: string) => n.toLowerCase())])];
      if (allSearchNames.length > 0) {
        try {
          await db
            .update(users)
            .set({ lastSeen: new Date() })
            .where(
              and(
                eq(users.role, "customer"),
                inArray(users.pppoeUsername, allSearchNames)
              )
            );
        } catch (dbErr) {
          console.error("Batch update lastSeen failed:", dbErr);
        }
      }
    }

    const errorMessage = details.status.ok ? null : (details.status.error || "Connection failed");

    let finalSecrets = details.secrets || [];
    let finalActive = details.active || [];

    if (session.role === "reseller") {
      const resellerCustomers = await db.query.users.findMany({
        where: and(eq(users.role, "customer"), eq(users.resellerId, session.userId)),
        columns: { pppoeUsername: true }
      });
      const allowedUsernames = new Set(
        resellerCustomers.map(c => c.pppoeUsername?.toLowerCase()).filter(Boolean)
      );
      finalSecrets = finalSecrets.filter((s: any) => allowedUsernames.has(s.name?.toLowerCase()));
      finalActive = finalActive.filter((a: any) => allowedUsernames.has(a.name?.toLowerCase()));
    }

    return NextResponse.json({
      secrets: finalSecrets,
      active: finalActive,
      routerStatus: {
        ok: details.status.ok,
        version: details.status.version || "Unknown",
        error: errorMessage || undefined
      },
      profiles: details.profiles || [],
      error: errorMessage,
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
