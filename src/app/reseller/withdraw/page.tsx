import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import WithdrawClient from "./WithdrawClient";

export const dynamic = "force-dynamic";

export default async function ResellerWithdrawPage() {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    redirect("/login/reseller");
  }

  const reseller = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  const walletBalance = reseller ? Number(reseller.walletBalance || 0) : 0;

  return <WithdrawClient initialBalance={walletBalance} />;
}
