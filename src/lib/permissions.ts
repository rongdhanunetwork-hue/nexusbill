import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Check if a user (Super Admin, Reseller, or Employee) has a specific access control permission.
 * Admin always returns true. Resellers and Employees are checked against their stored permissions JSON.
 */
export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return false;
    if (user.role === "admin") return true; // Super Admin has all permissions bypass

    const userPermissions = JSON.parse(user.permissions || "[]") as string[];
    return userPermissions.includes(permission);
  } catch (err) {
    console.error("Error in hasPermission check:", err);
    return false;
  }
}
