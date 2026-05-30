import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { insertAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allUsers = await db.query.users.findMany({
      where: eq(users.role, "customer"),
      with: { package: true, area: true }
    });

    // Generate CSV for BTRC
    // BTRC standard format: SL, Customer Name, Contact Number, Address, IP Address, MAC Address, Package/Speed, Connection Date, Status
    let csvData = "SL,Customer Name,Contact Number,Address,IP Address,MAC Address,Package/Speed,Connection Date,Status\n";

    allUsers.forEach((user, index) => {
      const sl = index + 1;
      const name = `"${user.name.replace(/"/g, '""')}"`;
      const phone = `"${user.phone}"`;
      const address = `"${(user.address || "").replace(/"/g, '""')}"`;
      const ip = `"${user.ipAddress || ""}"`;
      const mac = `"${user.macAddress || ""}"`;
      const pkg = `"${user.package?.name || "N/A"} (${user.package?.speed || ""})"`;
      const connDate = `"${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}"`;
      const status = `"${user.status || ""}"`;

      csvData += `${sl},${name},${phone},${address},${ip},${mac},${pkg},${connDate},${status}\n`;
    });

    await insertAuditLog(session.userId, "DOWNLOAD_BTRC_REPORT", `Downloaded BTRC Compliance CSV Report (${allUsers.length} records)`);

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="BTRC_Report_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("BTRC Report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
