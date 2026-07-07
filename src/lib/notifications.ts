import { db } from "@/db";
import { systemNotifications, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function createNotificationForAdmins(title: string, message: string, link?: string) {
  try {
    // Get all admin users
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    
    if (admins.length === 0) return;

    const notifs = admins.map(admin => ({
      userId: admin.id,
      title,
      message,
      link,
      isRead: false,
    }));

    await db.insert(systemNotifications).values(notifs);
  } catch (error) {
    console.error("Error creating notification for admins:", error);
  }
}

export async function createNotificationForUser(userId: number, title: string, message: string, link?: string) {
  try {
    await db.insert(systemNotifications).values({
      userId,
      title,
      message,
      link,
      isRead: false,
    });
  } catch (error) {
    console.error("Error creating notification for user:", error);
  }
}
