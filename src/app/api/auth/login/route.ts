import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { phone, password, role, rememberMe, otpToken } = await req.json();

    if (!phone || !password || !role) {
      return NextResponse.json({ error: "Phone, password, and role required" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone.trim()),
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.role !== role) {
      return NextResponse.json({ error: "Access denied for this portal" }, { status: 403 });
    }

    if (user.approvalStatus === "pending") {
      return NextResponse.json({ error: "Your account is pending approval by admin" }, { status: 403 });
    }

    if (user.approvalStatus === "rejected") {
      return NextResponse.json({ error: "Your account has been rejected. Contact support." }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // IP Binding Check for Customers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip")?.trim() || 
                     "127.0.0.1";
    if (user.role === "customer" && user.ipAddress) {
      const boundIp = user.ipAddress.trim();
      if (boundIp && boundIp !== clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
        return NextResponse.json({ error: `IP Binding error: Access locked to IP ${boundIp}` }, { status: 403 });
      }
    }

    // 2FA Verification
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!otpToken) {
        return NextResponse.json({ error: "2FA_REQUIRED", message: "OTP Token is required" }, { status: 401 });
      }
      const speakeasy = require("speakeasy");
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: otpToken
      });
      if (!verified) {
        return NextResponse.json({ error: "Invalid OTP token" }, { status: 401 });
      }
    }

    await createSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
    }, !!rememberMe);

    return NextResponse.json({
      success: true,
      role: user.role,
      name: user.name,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
