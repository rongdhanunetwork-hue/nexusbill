import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, invoices, notices } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const customer = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: { package: true },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const [dueResult] = await db
    .select({ sum: sql<number>`cast(coalesce(sum(${invoices.amount}),0) as int)` })
    .from(invoices)
    .where(sql`${invoices.userId} = ${customer.id} and ${invoices.status} in ('unpaid','due')`);

  const latestNotice = await db.query.notices.findFirst({ orderBy: [desc(notices.createdAt)] });

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    photoUrl: customer.photoUrl,
    packageName: customer.package?.name || "No Package",
    packageSpeed: customer.package?.speed || "N/A",
    packagePrice: customer.package?.price || null,
    expireDate: customer.expireDate?.toISOString() || null,
    status: customer.status,
    billStatus: (dueResult?.sum || 0) > 0 ? "Unpaid" : "Paid",
    dueAmount: dueResult?.sum || 0,
    pppoeUsername: customer.pppoeUsername,
    notice: latestNotice ? { title: latestNotice.title, message: latestNotice.message, type: latestNotice.type } : null,
  });
}
