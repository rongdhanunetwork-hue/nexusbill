import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Action Switch Back to Super Admin
    if (body.action === "back") {
      if (!session.impersonatorId) {
        return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
      }

      // Fetch the Super Admin
      const superAdmin = await db.query.users.findFirst({
        where: eq(users.id, session.impersonatorId)
      });

      if (!superAdmin || superAdmin.role !== "superadmin") {
        return NextResponse.json({ error: "Super Admin account not found" }, { status: 404 });
      }

      // Restore Super Admin Session
      await createSession({
        userId: superAdmin.id,
        role: superAdmin.role,
        name: superAdmin.name,
        phone: superAdmin.phone,
      });

      return NextResponse.json({ success: true, redirect: "/superadmin/admins" });
    }

    // Action Impersonate Admin
    const { adminId } = body;
    if (!adminId) {
      return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
    }

    // Ensure logged-in user is Super Admin
    if (session.role !== "superadmin") {
      return NextResponse.json({ error: "Only Super Admin can impersonate" }, { status: 403 });
    }

    // Fetch Target Admin
    const targetAdmin = await db.query.users.findFirst({
      where: and(eq(users.id, Number(adminId)), eq(users.role, "admin"))
    });

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    // Create impersonation session
    await createSession({
      userId: targetAdmin.id,
      role: targetAdmin.role,
      name: targetAdmin.name,
      phone: targetAdmin.phone,
      impersonatorId: session.userId, // Save the Super Admin ID
    });

    return NextResponse.json({ success: true, redirect: "/admin" });
  } catch (err: any) {
    console.error("Impersonation error:", err);
    return NextResponse.json({ error: err.message || "Failed to impersonate" }, { status: 500 });
  }
}
