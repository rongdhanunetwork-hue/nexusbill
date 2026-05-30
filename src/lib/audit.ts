import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { headers } from "next/headers";

export async function insertAuditLog(
  userId: number,
  action: string,
  details: any
) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      headersList.get("x-real-ip")?.trim() || 
                      "127.0.0.1";

    await db.insert(auditLogs).values({
      userId,
      action,
      details: typeof details === "string" ? details : JSON.stringify(details),
      ipAddress,
    });
  } catch (error) {
    console.error("Failed to insert audit log:", error);
  }
}
