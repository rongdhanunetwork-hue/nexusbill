import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { packageChangeRequests, users, packages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { createNotificationForAdmins } from "@/lib/notifications";

// GET /api/customer/package-change — fetch logged-in customer's package change requests
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db.query.packageChangeRequests.findMany({
      where: eq(packageChangeRequests.userId, session.userId),
      orderBy: [desc(packageChangeRequests.createdAt)],
      with: {
        currentPackage: true,
        requestedPackage: true,
      }
    });
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/customer/package-change — submit a package change request
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { requestedPackageId } = await req.json();

    if (!requestedPackageId) {
      return NextResponse.json({ error: "Requested package ID is required" }, { status: 400 });
    }

    const pkgId = Number(requestedPackageId);
    const targetPackage = await db.query.packages.findFirst({
      where: eq(packages.id, pkgId),
    });

    if (!targetPackage) {
      return NextResponse.json({ error: "Requested package not found" }, { status: 404 });
    }

    // Get current customer details
    const customer = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
    }

    if (customer.packageId === pkgId) {
      return NextResponse.json({ error: "You are already subscribed to this package" }, { status: 400 });
    }

    // Check if there is already a pending package change request
    const existingPending = await db.query.packageChangeRequests.findFirst({
      where: eq(packageChangeRequests.userId, session.userId) && eq(packageChangeRequests.status, "pending"),
    });

    if (existingPending) {
      return NextResponse.json({ error: "You already have a pending package change request. Please wait for admin approval." }, { status: 400 });
    }

    // Create request
    const [newRequest] = await db.insert(packageChangeRequests).values({
      userId: session.userId,
      currentPackageId: customer.packageId,
      requestedPackageId: pkgId,
      status: "pending",
    }).returning();

    await createNotificationForAdmins(
      "Package Change Request",
      `Customer ${customer.name || customer.phone} requested a package change to ${targetPackage.name}`,
      "/admin/package-requests"
    );

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
