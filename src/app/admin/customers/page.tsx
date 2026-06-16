import { db } from "@/db";
import { users, mikrotiks } from "@/db/schema";
import { eq, asc, and, isNull } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Plus } from "lucide-react";
import CustomersClient from "./CustomersClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

import { syncMikrotikSecrets, syncDeleteCustomerFromMikrotik } from "@/lib/sync";
import SyncCustomersButton from "@/components/admin/SyncCustomersButton";

export const dynamic = "force-dynamic";

async function deleteCustomer(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return;

  const id = Number(formData.get("id"));
  if (id) {
    // Fetch customer first to get PPPoE username for MikroTik cleanup
    const customer = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!customer || customer.adminId !== session.userId) return;

    if (customer?.pppoeUsername) {
      try {
        await syncDeleteCustomerFromMikrotik(customer.pppoeUsername, customer.mikrotikId, [id]);
      } catch (err) {
        console.warn("Failed to remove customer from MikroTik on delete:", err);
      }
    }
    await db.delete(users).where(eq(users.id, id));
  }
  revalidatePath("/admin/customers");
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login/admin");
  }

  const { status } = await searchParams;

  // Sync MikroTik secrets for this admin's routers in the background
  db.select({ id: mikrotiks.id })
    .from(mikrotiks)
    .where(and(eq(mikrotiks.status, true), eq(mikrotiks.adminId, session.userId)))
    .then((routers) => {
      for (const r of routers) {
        syncMikrotikSecrets(undefined, r.id).catch((err) => {
          console.warn(`Background MikroTik sync error on router ${r.id}:`, err);
        });
      }
      // If admin is default admin (adminId = 1), also sync the default router (null)
      if (session.userId === 1) {
        syncMikrotikSecrets(undefined, null).catch((err) => {
          console.warn("Background MikroTik sync error on default router:", err);
        });
      }
    })
    .catch((err) => {
      console.warn("Failed to fetch routers for background sync:", err);
    });

  const allCustomers = await db.query.users.findMany({
    where: and(eq(users.role, "customer"), eq(users.adminId, session.userId), isNull(users.resellerId)),
    orderBy: [asc(users.name)],
    with: { package: true, mikrotik: true }
  });

  const resellers = await db.query.users.findMany({
    where: and(eq(users.role, "reseller"), eq(users.adminId, session.userId)),
    columns: { id: true, name: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Customer Management</h1>
        <div className="flex items-center gap-3">
          <SyncCustomersButton />
          <Link href="/admin/customers/new" className="bg-neon-blue/20 text-neon-blue border border-neon-blue/50 px-5 py-2.5 rounded-xl font-semibold hover:bg-neon-blue/30 flex items-center gap-2 transition-colors no-print">
            <Plus size={20} /> Add Customer
          </Link>
        </div>
      </div>

      <CustomersClient 
        allCustomers={allCustomers as any} 
        deleteCustomerAction={deleteCustomer} 
        activePppoeNames={[]}
        activeSessions={[]}
        initialStatus={status}
        resellers={resellers}
      />
    </div>
  );
}
