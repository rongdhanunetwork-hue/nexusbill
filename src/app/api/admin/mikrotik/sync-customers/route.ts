import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, mikrotiks, packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, getAdminIdForSession } from "@/lib/auth";
import { getPppoeSecrets } from "@/lib/mikrotik";
import bcrypt from "bcryptjs";

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

    // 2. Fetch existing PPPoE customers
    const existingCustomers = await db.query.users.findMany({
      where: eq(users.adminId, adminId),
    });
    
    // Create a set of existing PPPoE usernames (lowercase)
    const existingPppoeUsernames = new Set(
      existingCustomers
        .map(c => c.pppoeUsername?.toLowerCase())
        .filter(Boolean)
    );

    // 3. Fetch packages to map profiles to package IDs
    const existingPackages = await db.query.packages.findMany({
      where: eq(packages.adminId, adminId),
    });
    
    const packageMap = new Map();
    existingPackages.forEach(pkg => {
      // Map exact name
      packageMap.set(pkg.name.toLowerCase(), pkg.id);
      // Map normalized speed
      const normSpeed = pkg.speed.toLowerCase().replace(/\s+/g, "");
      packageMap.set(normSpeed, pkg.id);
      // Map just number
      const speedNumber = pkg.speed.replace(/[^0-9]/g, "");
      if (speedNumber) {
        packageMap.set(`num_${speedNumber}`, pkg.id);
      }
    });

    let newCount = 0;
    const errors: string[] = [];
    const defaultPassword = await bcrypt.hash("123456", 12);

    // 4. Sync from all routers
    for (const router of routers) {
      try {
        const secrets = await getPppoeSecrets(router.id);
        
        for (const secret of secrets) {
          const username = secret.name;
          const lowerUser = username.toLowerCase();
          
          if (!username || existingPppoeUsernames.has(lowerUser)) {
            continue; // Already exists or invalid
          }

          // Try to map profile to a package
          const profileLower = secret.profile?.toLowerCase() || "";
          let matchedPackageId = null;
          
          if (packageMap.has(profileLower)) {
            matchedPackageId = packageMap.get(profileLower);
          } else {
            const profileNum = profileLower.replace(/[^0-9]/g, "");
            if (profileNum && packageMap.has(`num_${profileNum}`)) {
              matchedPackageId = packageMap.get(`num_${profileNum}`);
            }
          }

          const status = secret.disabled === "true" ? "suspended" : "active";
          const phone = `01000${Math.floor(100000 + Math.random() * 900000)}`; // Placeholder phone, must be unique
          
          // Insert new customer
          await db.insert(users).values({
            name: username,
            phone: phone, // They will need to edit this later
            password: defaultPassword,
            plainPassword: "123456",
            role: "customer",
            adminId,
            pppoeUsername: username,
            mikrotikId: router.id,
            packageId: matchedPackageId,
            status: status,
            approvalStatus: "approved",
            walletBalance: "0",
            connectionType: "fiber",
            joiningDate: new Date(),
          });

          existingPppoeUsernames.add(lowerUser);
          newCount++;
        }
      } catch (err: any) {
        errors.push(`Router ${router.name}: ${err.message || "Failed to connect"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${newCount} customers from MikroTik.`,
      newCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Sync customers error:", err);
    return NextResponse.json({ error: "Server error during sync" }, { status: 500 });
  }
}
