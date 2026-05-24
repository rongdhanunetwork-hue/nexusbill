import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentHistoryPage() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    redirect("/login/customer");
  }

  const userPayments = await db.query.payments.findMany({
    where: eq(payments.userId, session.userId),
    orderBy: [desc(payments.createdAt)],
  });

  const customer = { name: session.name };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white tracking-wide">Payment History</h1>

      <>
          {/* Summary */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-5 flex items-center gap-3">
              <CheckCircle size={20} className="text-neon-green" />
              <div>
                <p className="text-gray-400 text-sm">Paid</p>
                <p className="text-xl font-bold text-white">{userPayments.filter(p => p.status === 'approved').length}</p>
              </div>
            </div>
            <div className="glass-card p-5 flex items-center gap-3">
              <Clock size={20} className="text-yellow-400" />
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-xl font-bold text-white">{userPayments.filter(p => p.status === 'pending').length}</p>
              </div>
            </div>
            <div className="glass-card p-5 flex items-center gap-3">
              <XCircle size={20} className="text-red-400" />
              <div>
                <p className="text-gray-400 text-sm">Rejected</p>
                <p className="text-xl font-bold text-white">{userPayments.filter(p => p.status === 'rejected').length}</p>
              </div>
            </div>
          </div>

          {/* Payments List */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold text-white">All Transactions</h2>
            </div>
            <div className="divide-y divide-white/5">
              {userPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText size={40} className="mx-auto mb-3 text-gray-600" />
                  <p>No payment history yet.</p>
                </div>
              ) : (
                userPayments.map((payment) => (
                  <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${payment.status === 'approved' ? 'bg-neon-green/20' : payment.status === 'rejected' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                        {payment.status === 'approved' ? <CheckCircle size={18} className="text-neon-green" /> : 
                         payment.status === 'rejected' ? <XCircle size={18} className="text-red-400" /> : 
                         <Clock size={18} className="text-yellow-400" />}
                      </div>
                      <div>
                        <p className="text-white font-medium">৳{payment.amount}</p>
                        <p className="text-gray-400 text-sm">{payment.method ? payment.method.toUpperCase() : 'N/A'} — {payment.trxId || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">{payment.createdAt?.toLocaleDateString()}</p>
                      <span className={`text-xs font-semibold capitalize ${payment.status === 'approved' ? 'text-neon-green' : payment.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
    </div>
  );
}
