import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import CustomersClient from "@/app/admin/customers/CustomersClient";

export const dynamic = "force-dynamic";

export default async function EmployeeCustomersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  const allCustomers = await db.query.users.findMany({
    where: eq(users.role, "customer"),
    orderBy: [asc(users.name)],
    with: { package: true, mikrotik: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Customer Management</h1>
      </div>

      <CustomersClient 
        allCustomers={allCustomers as any} 
        activePppoeNames={[]}
        activeSessions={[]}
        initialStatus={status}
        role="employee"
      />
    </div>
  );
}
