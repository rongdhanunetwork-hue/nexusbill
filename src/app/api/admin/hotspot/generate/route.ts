import { NextResponse } from "next/server";
import { db } from "@/db";
import { hotspotVouchers, packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHotspotUser } from "@/lib/mikrotik";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { routerId, packageId, quantity, prefix, length, limitUptime, limitBytesTotal } = body;

    if (!routerId || !packageId || !quantity || quantity < 1 || quantity > 1000) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const pkg = await db.query.packages.findFirst({ where: eq(packages.id, Number(packageId)) });
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const vouchersToInsert = [];
    const generatedVouchers = [];

    const generateRandomCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded O,0,I,1 for readability
      let result = prefix || "";
      for (let i = 0; i < Number(length); i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // We will generate them and push them to MikroTik first. If push is successful, we save to DB.
    // To speed this up, we push in parallel chunks.
    for (let i = 0; i < quantity; i++) {
      const code = generateRandomCode();
      const voucherData = {
        name: code,
        password: code, // Username = Password for PIN mode
        profile: pkg.name, // Assuming Hotspot Profile = Package Name
        server: "all",
        limitUptime: limitUptime || undefined,
        limitBytesTotal: limitBytesTotal || undefined,
        comment: `Voucher: ${pkg.name}`,
      };

      try {
        await createHotspotUser(voucherData, Number(routerId));
        
        vouchersToInsert.push({
          code,
          password: code,
          packageId: Number(packageId),
          mikrotikId: Number(routerId),
          adminId: Number(session.userId),
          price: String(pkg.price),
          status: "unused",
        });

        generatedVouchers.push({
          code,
          password: code,
          packageId: Number(packageId),
          price: pkg.price,
          status: "unused",
          createdAt: new Date().toISOString(),
        });

      } catch (err) {
        console.warn("Failed to create hotspot user on mikrotik:", err);
      }
    }

    if (vouchersToInsert.length > 0) {
      await db.insert(hotspotVouchers).values(vouchersToInsert);
    }

    return NextResponse.json({ vouchers: generatedVouchers, count: vouchersToInsert.length });
  } catch (err: any) {
    console.error("Hotspot generation error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
