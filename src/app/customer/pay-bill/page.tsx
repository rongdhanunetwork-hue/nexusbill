import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import PayBillClient from "./PayBillClient";

export const dynamic = "force-dynamic";

export default async function PayBillPage() {
  // Fetch bKash and Nagad numbers from admin settings
  const bkashRow = await db.query.settings.findFirst({ where: eq(settings.key, "bkash_number") });
  const nagadRow = await db.query.settings.findFirst({ where: eq(settings.key, "nagad_number") });
  const rocketRow = await db.query.settings.findFirst({ where: eq(settings.key, "rocket_number") });

  return (
    <PayBillClient
      bkashNumber={bkashRow?.value || "017XXXXXXXX"}
      nagadNumber={nagadRow?.value || "018XXXXXXXX"}
      rocketNumber={rocketRow?.value || "019XXXXXXXX"}
    />
  );
}
