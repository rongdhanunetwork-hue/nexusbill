import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { step, phone, otp, password } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone.trim()),
    });

    if (!user) {
      return NextResponse.json({ error: "No account registered with this phone number" }, { status: 404 });
    }

    if (step === "send-otp") {
      // Mock OTP sending. In production, connect to real SMS gateway
      return NextResponse.json({
        success: true,
        message: "Verification code sent to your phone. Use '123456' for testing.",
      });
    }

    if (step === "verify-otp") {
      if (otp !== "123456") {
        return NextResponse.json({ error: "Invalid OTP code. Use '123456'." }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "OTP verified successfully" });
    }

    if (step === "reset") {
      if (otp !== "123456") {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      if (!password || password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Forgot password API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
