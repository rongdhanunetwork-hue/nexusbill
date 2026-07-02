import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, users } from "@/db/schema";
import { sql, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Get all customers with unpaid/due invoices
    const dueInvoices = await db.query.invoices.findMany({
      where: sql`${invoices.status} in ('unpaid', 'due')`,
      with: { user: true },
    });

    // Unique customers (avoid duplicate SMS)
    const uniqueCustomers = new Map<number, { name: string; phone: string; amount: string }>();
    for (const inv of dueInvoices) {
      if (inv.user && inv.user.phone && !uniqueCustomers.has(inv.userId)) {
        uniqueCustomers.set(inv.userId, {
          name: inv.user.name,
          phone: inv.user.phone,
          amount: inv.amount,
        });
      }
    }

    const { sendSMS } = await import("@/lib/sms");

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const [, customer] of uniqueCustomers) {
      const msg = `প্রিয় ${customer.name}, আপনার ইন্টারনেট বিল ৳${customer.amount} পরিশোধ করা হয়নি। দয়া করে দ্রুত বিল পরিশোধ করুন। সংযোগ বিচ্ছিন্ন হওয়ার আগেই পেমেন্ট করুন।`;
      const result = await sendSMS(customer.phone, msg);
      if (result.success) {
        sent++;
      } else if (result.error?.includes("Duplicate prevented")) {
        skipped++;
      } else {
        failed++;
      }
      // Avoid API rate limit
      await new Promise((r) => setTimeout(r, 100));
    }

    return NextResponse.json({ success: true, sent, failed, skipped, total: uniqueCustomers.size });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
