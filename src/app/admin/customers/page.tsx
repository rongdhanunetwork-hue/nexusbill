import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Plus } from "lucide-react";
import CustomersClient from "./CustomersClient";

import { syncMikrotikSecrets, syncDeleteCustomerFromMikrotik } from "@/lib/sync";

export const dynamic = "force-dynamic";

async function deleteCustomer(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (id) {
    // Fetch customer first to get PPPoE username for MikroTik cleanup
    const customer = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (customer?.pppoeUsername) {
      try {
        await syncDeleteCustomerFromMikrotik(customer.pppoeUsername);
      } catch (err) {
        console.error("Failed to remove customer from MikroTik on delete:", err);
      }
    }
    await db.delete(users).where(eq(users.id, id));
  }
  revalidatePath("/admin/customers");
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  // Sync MikroTik secrets to DB in the background
  syncMikrotikSecrets().catch((err) => {
    console.error("Background MikroTik sync error on customers page:", err);
  });

  // Fetch database customers only to load page instantly
  const allCustomers = await db.query.users.findMany({
    where: eq(users.role, "customer"),
    orderBy: [asc(users.name)],
    with: { package: true, mikrotik: true }
  });

  const resellers = await db.query.users.findMany({
    where: eq(users.role, "reseller"),
    columns: { id: true, name: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Customer Management</h1>
        <Link href="/admin/customers/new" className="bg-neon-blue/20 text-neon-blue border border-neon-blue/50 px-5 py-2.5 rounded-xl font-semibold hover:bg-neon-blue/30 flex items-center gap-2 transition-colors no-print">
          <Plus size={20} /> Add Customer
        </Link>
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
