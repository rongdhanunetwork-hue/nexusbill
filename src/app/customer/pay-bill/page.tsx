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
  // Calculate dates
  const now = new Date();
  let baseDate = now;
  const isCustomerActive = customer?.status === "active" && customer?.expireDate && new Date(customer.expireDate) > now;
  if (isCustomerActive && customer?.expireDate) {
    baseDate = new Date(customer.expireDate);
  }

  const expirationDate = baseDate;
  const nextMonth = new Date(expirationDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const formatDate = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = date.getDate().toString().padStart(2, '0');
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    let h = date.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${d} ${m} ${y}, ${h}:${mins} ${ampm}`;
  };

  return (
    <PayBillClient
      bkashNumber={bkashRow?.value || "01580838281"}
      bkashNumber2={bkashRow2?.value || ""}
      bankCardNumber={bankCardRow?.value || ""}
      packagePrice={packagePrice}
      packageName={packageName}
      pppoeId={customer?.pppoeUsername || "Unknown"}
      customerName={customer?.name || "Unknown"}
      billDate={formatDate(expirationDate)}
      newBillDate={formatDate(nextMonth)}
    />
  );
}
