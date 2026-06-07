import { db } from "../src/db";
import { payments, users } from "../src/db/schema";
import { eq, and, gte } from "drizzle-orm";

async function main() {
  const bdTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
  const d = new Date(bdTime);
  const startOfMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

  console.log("--- Approved Payments This Month ---");
  const approvedPayments = await db
    .select({
      paymentId: payments.id,
      amount: payments.amount,
      createdAt: payments.createdAt,
      status: payments.status,
      userName: users.name,
      userId: users.id,
      phone: users.phone,
    })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .where(
      and(
        eq(payments.status, "approved"),
        gte(payments.createdAt, new Date(startOfMonthStr))
      )
    );

  console.log(`Total count: ${approvedPayments.length}`);
  console.log(approvedPayments);
}

main().catch(console.error).finally(() => process.exit());
