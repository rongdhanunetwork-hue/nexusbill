import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("nexusbill_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login/admin", req.url));
    }
    const session = await verifyToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/login/admin", req.url));
    }
    return NextResponse.next();
  }

  // Protect /customer routes
  if (pathname.startsWith("/customer")) {
    const token = req.cookies.get("nexusbill_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login/customer", req.url));
    }
    const session = await verifyToken(token);
    if (!session || session.role !== "customer") {
      return NextResponse.redirect(new URL("/login/customer", req.url));
    }
    return NextResponse.next();
  }

  // Protect /reseller routes
  if (pathname.startsWith("/reseller")) {
    const token = req.cookies.get("nexusbill_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login/reseller", req.url));
    }
    const session = await verifyToken(token);
    if (!session || session.role !== "reseller") {
      return NextResponse.redirect(new URL("/login/reseller", req.url));
    }
    return NextResponse.next();
  }

  // Protect /employee routes
  if (pathname.startsWith("/employee")) {
    const token = req.cookies.get("nexusbill_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login/employee", req.url));
    }
    const session = await verifyToken(token);
    if (!session || session.role !== "employee") {
      return NextResponse.redirect(new URL("/login/employee", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/customer/:path*",
    "/reseller/:path*",
    "/employee/:path*",
  ],
};
