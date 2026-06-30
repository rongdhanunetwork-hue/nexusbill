import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

// GET: Generate new 2FA Secret & QR Code
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customer = await db.query.users.findFirst({
    where: eq(users.id, session.userId)
  });

  if (!customer) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (customer.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  const secret = speakeasy.generateSecret({ name: `ISP Billing (${customer.phone})` });
  const qrUrl = await qrcode.toDataURL(secret.otpauth_url!);

  // Save the temporary secret to DB (Wait until verified to enable fully)
  await db.update(users)
    .set({ twoFactorSecret: secret.base32 })
    .where(eq(users.id, customer.id));

  return NextResponse.json({ qrUrl, secret: secret.base32 });
}

// POST: Verify and Enable 2FA or Disable 2FA
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, token } = await req.json();

    const customer = await db.query.users.findFirst({
      where: eq(users.id, session.userId)
    });

    if (!customer) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "enable") {
      if (!customer.twoFactorSecret) {
        return NextResponse.json({ error: "Secret not generated" }, { status: 400 });
      }

      const verified = speakeasy.totp.verify({
        secret: customer.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 1
      });

      if (!verified) {
        return NextResponse.json({ error: "Invalid OTP token" }, { status: 400 });
      }

      await db.update(users)
        .set({ twoFactorEnabled: true })
        .where(eq(users.id, customer.id));

      return NextResponse.json({ success: true, message: "2FA Enabled successfully" });
    }

    if (action === "disable") {
      if (!customer.twoFactorEnabled || !customer.twoFactorSecret) {
        return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
      }

      const verified = speakeasy.totp.verify({
        secret: customer.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 1
      });

      if (!verified) {
        return NextResponse.json({ error: "Invalid OTP token" }, { status: 400 });
      }

      await db.update(users)
        .set({ twoFactorEnabled: false, twoFactorSecret: null })
        .where(eq(users.id, customer.id));

      return NextResponse.json({ success: true, message: "2FA Disabled successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("2FA Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
