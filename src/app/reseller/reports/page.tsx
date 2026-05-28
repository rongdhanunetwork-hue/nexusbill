import { db } from "@/db";
import { payments, users, packages, invoices } from "@/db/schema";
import { desc, eq, sql, inArray, and } from "drizzle-orm";
import { FileText, RotateCcw } from "lucide-react";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function rollbackResellerRecharge(formData: FormData) {
  "use server";
  const paymentId = Number(formData.get("paymentId"));
  if (!paymentId) return;

  try {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment || payment.status !== "approved" || payment.method !== "reseller_wallet") return;

    const customer = await db.query.users.findFirst({
      where: eq(users.id, payment.userId),
    });
    if (!customer) return;

    // Verify customer belongs to the reseller to prevent unauthorized rollback
    const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
    if (!reseller || customer.resellerId !== reseller.id) return;

    // Determine package duration
    let durationDays = 30;
    if (customer.packageId) {
      const pkg = await db.query.packages.findFirst({
        where: eq(packages.id, customer.packageId)
      });
      if (pkg && pkg.durationDays) {
        durationDays = pkg.durationDays;
      }
    }

    const currentExpire = customer.expireDate ? new Date(customer.expireDate) : new Date();
    const newExpire = new Date(currentExpire.getTime() - durationDays * 24 * 60 * 60 * 1000);
    
    const now = new Date();
    const isExpired = newExpire <= now;
    const newStatus = isExpired ? "expired" : "active";

    // Revert user expiry and status in DB
    await db.update(users)
      .set({
        expireDate: newExpire,
        status: newStatus
      })
      .where(eq(users.id, customer.id));

    // Mark payment rolled_back
    await db.update(payments)
      .set({ status: "rolled_back" })
      .where(eq(payments.id, paymentId));

    // Refund reseller wallet
    const currentWallet = Number(reseller.walletBalance || 0);
    const refundAmount = Number(payment.amount);
    await db.update(users)
      .set({ walletBalance: String(currentWallet + refundAmount) })
      .where(eq(users.id, reseller.id));

    // Delete matching invoice if one exists
    const matchInvoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.userId, customer.id),
        eq(invoices.amount, payment.amount),
        eq(invoices.status, "paid")
      ),
      orderBy: [desc(invoices.createdAt)],
    });

    if (matchInvoice) {
      await db.delete(invoices).where(eq(invoices.id, matchInvoice.id));
    }

    // Sync to MikroTik router
    if (customer.pppoeUsername) {
      const { syncCustomerToMikrotik } = await import("@/lib/sync");
      await syncCustomerToMikrotik(
        customer.pppoeUsername,
        undefined,
        customer.packageId,
        newStatus
      );
    }
  } catch (err) {
    console.error("Reseller rollback payment error:", err);
  }

  revalidatePath("/reseller/reports");
  revalidatePath("/reseller/recharge");
  revalidatePath("/reseller");
}

export default async function ResellerReportsPage() {
  const reseller = await db.query.users.findFirst({ where: eq(users.role, "reseller") });
  const ids = await db.select({ id: users.id }).from(users).where(sql`${users.role}='customer' and ${users.resellerId}=${reseller?.id || 0}`);
  const idList = ids.map(i => i.id);
  const reports = idList.length ? await db.query.payments.findMany({ where: inArray(payments.userId, idList), orderBy: [desc(payments.createdAt)], with: { user: true } }) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-wide">Recharge & Session Reports</h1>
      
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-white/5 flex gap-2">
          <FileText size={18} className="text-purple-300"/>
          <h2 className="text-white font-semibold">Reseller Transaction Report</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-gray-400 uppercase border-b border-white/10 bg-white/5">
                <th className="p-4">Customer (কাস্টমার)</th>
                <th className="p-4">Amount (টাকা)</th>
                <th className="p-4">Method (মাধ্যম)</th>
                <th className="p-4">Status (অবস্থা)</th>
                <th className="p-4">Date (তারিখ)</th>
                <th className="p-4 text-right">Action (অ্যাকশন)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No report yet.
                  </td>
                </tr>
              ) : (
                reports.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-all">
                    <td className="p-4">
                      <div className="font-medium text-white">{p.user?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.user?.phone}</div>
                    </td>
                    <td className="p-4 text-white font-bold">৳{p.amount}</td>
                    <td className="p-4 text-gray-300 capitalize">{p.method === "reseller_wallet" ? "Reseller Wallet" : p.method}</td>
                    <td className="p-4 capitalize">
                      <span className={
                        p.status === "approved" 
                          ? "text-neon-green font-semibold" 
                          : p.status === "rejected" 
                            ? "text-red-400" 
                            : p.status === "rolled_back" 
                              ? "text-gray-400 italic font-medium" 
                              : "text-yellow-400"
                      }>
                        {p.status === "rolled_back" ? "Rolled Back" : p.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-450">{p.createdAt?.toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      {p.status === "approved" && p.method === "reseller_wallet" && (
                        <form action={rollbackResellerRecharge}>
                          <input type="hidden" name="paymentId" value={p.id} />
                          <button 
                            type="submit" 
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold hover:bg-red-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <RotateCcw size={12} />
                            Recharge Back
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
