import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nexusbill-isp-secret-key-change-in-production-2024"
);

const COOKIE_NAME = "nexusbill_session";

export interface SessionPayload {
  userId: number;
  role: string;
  name: string;
  phone: string;
  impersonatorId?: number;
}

export async function createSession(payload: SessionPayload, rememberMe?: boolean): Promise<string> {
  const expiry = "365d";
  const maxAge = 365 * 24 * 60 * 60; // 1 year by default for all logins

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAge,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

// Lightweight verify for middleware (does not use cookies() — takes token directly)
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getAdminIdForSession(session: { userId: number; role: string }): Promise<number> {
  try {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    if (u?.adminId) return u.adminId;
  } catch (err) {
    console.error("Error in getAdminIdForSession:", err);
  }
  return session.role === "admin" ? session.userId : 1;
}
