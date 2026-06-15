import { NextResponse } from "next/server";
import { db } from "@/db";
import { packages, mikrotiks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, getAdminIdForSession } from "@/lib/auth";
import { getPppoeProfiles } from "@/lib/mikrotik";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminId = await getAdminIdForSession(session);

    // 1. Fetch all Mikrotik routers for this admin
    const routers = await db.query.mikrotiks.findMany({
      where: eq(mikrotiks.adminId, adminId),
    });

    if (routers.length === 0) {
      return NextResponse.json({ error: "No Mikrotik routers configured" }, { status: 400 });
    }

    // 2. Fetch existing packages
    const existingPackages = await db.query.packages.findMany({
      where: eq(packages.adminId, adminId),
    });
    const existingNames = new Set(existingPackages.map(p => p.name.toLowerCase()));

    let newCount = 0;
    const errors: string[] = [];

    // 3. Sync from all routers
    for (const router of routers) {
      try {
        const profiles = await getPppoeProfiles(router.id);
        
        for (const profile of profiles) {
          // Ignore default profiles
          if (profile.name === "default" || profile.name === "default-encryption") {
            continue;
          }

          if (!existingNames.has(profile.name.toLowerCase())) {
            // Extract speed from rate-limit if possible (e.g. "5M/5M" -> "5 Mbps")
            let speed = "Unknown";
            if (profile["rate-limit"]) {
              const parts = profile["rate-limit"].split("/");
              if (parts.length >= 2) {
                // Take download speed (usually the second part in rx/tx notation, but taking either is fine)
                speed = parts[1].replace(/M/ig, " Mbps").replace(/k/ig, " Kbps");
              } else {
                speed = profile["rate-limit"];
              }
            }

            await db.insert(packages).values({
              name: profile.name,
              speed: speed,
              price: "0", // Default to 0, admin must edit
              durationDays: 30, // Default to 30 days
              adminId,
            });

            existingNames.add(profile.name.toLowerCase());
            newCount++;
          }
        }
      } catch (err: any) {
        errors.push(`Router ${router.name}: ${err.message || "Failed to connect"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${newCount} new packages.`,
      newCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Sync packages error:", err);
    return NextResponse.json({ error: "Server error during sync" }, { status: 500 });
  }
}
