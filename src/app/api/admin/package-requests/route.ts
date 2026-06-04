import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { packageChangeRequests, users, packages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/admin/package-requests — fetch all customer package change requests
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db.query.packageChangeRequests.findMany({
      orderBy: [desc(packageChangeRequests.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            phone: true,
            pppoeUsername: true,
            status: true,
          }
        },
        currentPackage: true,
        requestedPackage: true,
      }
    });
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH /api/admin/package-requests — approve or reject package change request
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, action } = await req.json(); // action is 'approve' or 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 });
    }

    const request = await db.query.packageChangeRequests.findFirst({
      where: eq(packageChangeRequests.id, Number(id)),
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: `Request already processed as ${request.status}` }, { status: 400 });
    }

    const userId = request.userId;
    const requestedPkgId = request.requestedPackageId;

    if (action === "approve") {
      // 1. Fetch customer & requested package
      const customer = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }

      const targetPkg = await db.query.packages.findFirst({
        where: eq(packages.id, requestedPkgId),
      });

      if (!targetPkg) {
        return NextResponse.json({ error: "Requested package not found" }, { status: 404 });
      }

      // 2. Update customer package in DB
      await db.update(users)
        .set({ packageId: requestedPkgId })
        .where(eq(users.id, userId));

      // 3. Sync speed profile to MikroTik immediately if they have a PPPoE username
      if (customer.pppoeUsername) {
        try {
          const { syncCustomerToMikrotik } = await import("@/lib/sync");
          await syncCustomerToMikrotik(
            customer.pppoeUsername,
            undefined, // keep existing password
            requestedPkgId,
            customer.status || "active",
            customer.mikrotikId
          );
        } catch (syncErr) {
          console.error("[MikroTik Sync Error]:", syncErr);
        }
      }

      // 4. Update request status
      await db.update(packageChangeRequests)
        .set({ status: "approved" })
        .where(eq(packageChangeRequests.id, Number(id)));

      // 5. Send confirmation SMS
      try {
        const { sendSMS } = await import("@/lib/sms");
        await sendSMS(
          customer.phone,
          `Dear ${customer.name}, your package change request to standard profile (${targetPkg.name}) has been approved. Your profile is updated. Thank you!`,
          "manual"
        );
      } catch (smsErr) {
        console.error("SMS notification failed:", smsErr);
      }

      return NextResponse.json({ success: true, message: "Package change approved and synchronized successfully" });

    } else if (action === "reject") {
      // Update request status to rejected
      await db.update(packageChangeRequests)
        .set({ status: "rejected" })
        .where(eq(packageChangeRequests.id, Number(id)));

      // Send rejection SMS
      try {
        const customer = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        if (customer) {
          const { sendSMS } = await import("@/lib/sms");
          await sendSMS(
            customer.phone,
            `Dear ${customer.name}, your package change request has been declined. Please contact support for more details.`,
            "manual"
          );
        }
      } catch (smsErr) {
        console.error("SMS notification failed:", smsErr);
      }

      return NextResponse.json({ success: true, message: "Request rejected successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
