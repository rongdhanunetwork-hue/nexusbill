import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, packages, inventory, tickets, payments } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { insertAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all critical data
    const allUsers = await db.query.users.findMany();
    const allPackages = await db.query.packages.findMany();
    const allInventory = await db.query.inventory.findMany();
    const allTickets = await db.query.tickets.findMany();
    const allPayments = await db.query.payments.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      data: {
        users: allUsers,
        packages: allPackages,
        inventory: allInventory,
        tickets: allTickets,
        payments: allPayments,
      }
    };

    await insertAuditLog(session.userId, "DOWNLOAD_BACKUP", "Downloaded complete database JSON backup");

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ISP_Backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });

  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}
