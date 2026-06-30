import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import PayBillClient from "./PayBillClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PayBillPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Look up customer's adminId and package
  const customer = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: { package: true }
  });
  const adminId = customer?.adminId || 1;
  const packagePrice = customer?.package?.price || "0";
  const packageName = customer?.package?.name || "Unknown";

  // Fetch bKash and Nagad numbers from the customer's admin settings
  const bkashRow = await db.query.settings.findFirst({
    where: and(eq(settings.key, "bkash_number"), eq(settings.adminId, adminId))
  });
  const bkashRow2 = await db.query.settings.findFirst({
    where: and(eq(settings.key, "bkash_number_2"), eq(settings.adminId, adminId))
  });
  const bankCardRow = await db.query.settings.findFirst({
    where: and(eq(settings.key, "bank_card_number"), eq(settings.adminId, adminId))
  });
  return (
    <PayBillClient
      bkashNumber={bkashRow?.value || "01580838281"}
      bkashNumber2={bkashRow2?.value || "017XXXXXXXX"}
      bankCardNumber={bankCardRow?.value || "Dutch-Bangla Bank: 123.456.7890"}
      packagePrice={packagePrice}
      packageName={packageName}
    />
  );
}
