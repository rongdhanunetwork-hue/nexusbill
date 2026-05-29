import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, phone, message } = await req.json();

    let targetPhone = phone;

    if (userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, Number(userId)),
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      targetPhone = user.phone;
    }

    if (!targetPhone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const result = await sendSMS(targetPhone, message, "manual");

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
