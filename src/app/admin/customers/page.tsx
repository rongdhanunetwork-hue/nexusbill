import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Plus } from "lucide-react";
import CustomersClient from "./CustomersClient";

import { getPppoeActive } from "@/lib/mikrotik";
import { syncMikrotikSecrets } from "@/lib/sync";

export const dynamic = "force-dynamic";

async function deleteCustomer(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (id) await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/customers");
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  // Sync MikroTik secrets to DB first
  await syncMikrotikSecrets();

  // Fetch active PPPoE usernames from MikroTik router
  let activePppoeNames: string[] = [];
  try {
    const activeSessions = await getPppoeActive();
    activePppoeNames = activeSessions.map((s) => s.name);
  } catch (err) {
    console.error("Failed to fetch active sessions from MikroTik in customers page:", err);
  }

  const allCustomers = await db.query.users.findMany({
    where: eq(users.role, "customer"),
    orderBy: [desc(users.createdAt)],
    with: { package: true, mikrotik: true }
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
        activePppoeNames={activePppoeNames}
        initialStatus={status}
      />
    </div>
  );
}
