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

  // Look up customer's adminId
  const customer = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { adminId: true }
  });
  const adminId = customer?.adminId || 1;

  // Fetch bKash and Nagad numbers from the customer's admin settings
  const bkashRow = await db.query.settings.findFirst({
    where: and(eq(settings.key, "bkash_number"), eq(settings.adminId, adminId))
  });
  const bkashRow2 = await db.query.settings.findFirst({
    where: and(eq(settings.key, "bkash_number_2"), eq(settings.adminId, adminId))
  });
  return (
    <PayBillClient
      bkashNumber={bkashRow?.value || "017XXXXXXXX"}
      bkashNumber2={bkashRow2?.value || ""}
    />
  );
}
