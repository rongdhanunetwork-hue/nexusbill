import { db } from "@/db";
import { users, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/login/admin");
  }

  const adminUser = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!adminUser) {
    redirect("/login/admin");
  }

  // Get total customers count
  const customerList = await db.query.users.findMany({
    where: eq(users.role, "customer"),
  });
  const totalCustomers = customerList.length;

  // Get all settings
  const settingsRows = await db.query.settings.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settingsRows) {
    if (s.key && s.value) {
      settingsMap[s.key] = s.value;
    }
  }

  return (
    <ProfileClient
      adminUser={adminUser as any}
      totalCustomers={totalCustomers}
      initialSettings={settingsMap}
    />
  );
}
