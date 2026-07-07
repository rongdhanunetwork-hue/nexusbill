import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Plus } from "lucide-react";
import CustomersClient from "@/app/admin/customers/CustomersClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { syncDeleteCustomerFromMikrotik } from "@/lib/sync";

export const dynamic = "force-dynamic";

async function deleteCustomer(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || session.role !== "reseller") return;

  const id = Number(formData.get("id"));
  if (id) {
    const customer = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!customer || customer.resellerId !== session.userId) return;

    if (customer.pppoeUsername) {
      try {
        await syncDeleteCustomerFromMikrotik(customer.pppoeUsername, customer.mikrotikId, [id]);
      } catch (err) {
        console.error("Failed to remove customer from MikroTik on delete:", err);
      }
    }
    await db.delete(users).where(eq(users.id, id));
  }
  revalidatePath("/reseller/customers");
}

export default async function ResellerCustomersPage() {
  const session = await getSession();
  if (!session || session.role !== "reseller") {
    redirect("/login/reseller");
  }

  const allCustomers = await db.query.users.findMany({
    where: and(eq(users.role, "customer"), eq(users.resellerId, session.userId)),
    orderBy: [desc(users.createdAt)],
    with: { package: true, mikrotik: true }
  });

  const now = new Date();
  const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { payments } = await import("@/db/schema");
  const paidUsersThisMonthResult = await db.select({ userId: payments.userId })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .where(sql`${payments.status} = 'approved' and ${payments.createdAt} >= ${startOfMonthStr}::date and ${users.resellerId} = ${session.userId} and ${users.role} = 'customer'`);
  const paidUserIds = paidUsersThisMonthResult.map(r => r.userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Customer Management</h1>
        <Link href="/reseller/customers/new" className="bg-purple-500/20 text-purple-300 border border-purple-400/50 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-500/30 flex items-center gap-2 transition-colors no-print">
          <Plus size={20} /> Add Customer
        </Link>
      </div>

      <CustomersClient 
        allCustomers={allCustomers as any} 
        deleteCustomerAction={deleteCustomer}
        activePppoeNames={[]}
        activeSessions={[]}
        role="reseller"
        paidUserIdsThisMonth={paidUserIds}
      />
    </div>
  );
}
