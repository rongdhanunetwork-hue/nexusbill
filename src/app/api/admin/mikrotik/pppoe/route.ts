import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRouterDetails } from "@/lib/mikrotik";
import { syncMikrotikSecrets } from "@/lib/sync";
import { db } from "@/db";
import { users } from "@/db/schema";
import { inArray, eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all router details using a SINGLE connection sequentially
    const details = await getRouterDetails();

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

    return NextResponse.json({
      secrets: details.secrets,
      active: details.active,
      routerStatus: {
        ok: details.status.ok,
        version: details.status.version || "Unknown",
        error: errorMessage || undefined
      },
      profiles: details.profiles,
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
