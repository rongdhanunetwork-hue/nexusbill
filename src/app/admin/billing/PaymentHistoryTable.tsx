"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import RollbackButton from "./RollbackButton";
import { Pagination } from "@/components/ui/Pagination";

interface Payment {
  id: number;
  amount: string;
  method: string | null;
  trxId: string | null;
  status: string | null;
  createdAt: Date | null;
  user?: {
    name: string;
    pppoeUsername?: string | null;
  } | null;
}

interface Props {
  payments: Payment[];
  rollbackAction: (formData: FormData) => Promise<void>;
}

export default function PaymentHistoryTable({ payments, rollbackAction }: Props) {
  const [search, setSearch] = useState("");

  const filtered = payments.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.user?.name || "").toLowerCase().includes(q) ||
      (p.user?.pppoeUsername || "").toLowerCase().includes(q) ||
      (p.trxId || "").toLowerCase().includes(q) ||
      (p.method || "").toLowerCase().includes(q)
    );
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const paginatedFiltered = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header with search */}
      <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white">Payment History / Invoice</h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, PPPoE, Trx ID..."
            className="pl-8 pr-8 py-1.5 text-xs bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue/40 w-52"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-sm font-semibold text-gray-400 uppercase tracking-wider bg-white/5">
              <th className="p-4">Customer</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Method</th>
              <th className="p-4">Trx ID</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  {search ? `"${search}" এর জন্য কোনো ফলাফল পাওয়া যায়নি।` : "No payments yet."}
                </td>
              </tr>
            ) : (
              paginatedFiltered.map((payment) => (
                <tr key={payment.id} className="hover:bg-white/5">
                  {/* Customer name + PPPoE */}
                  <td className="p-4">
                    <div className="font-medium text-white">{payment.user?.name || "Unknown"}</div>
                    {payment.user?.pppoeUsername && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#0ea5e9]/10 border border-[#0ea5e9]/25 text-[#38bdf8] text-[10px] font-mono tracking-wide">
                        {payment.user.pppoeUsername}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-white font-bold">৳{payment.amount}</td>
                  <td className="p-4 text-gray-300 capitalize">{payment.method}</td>
                  <td className="p-4 text-gray-300 font-mono">{payment.trxId}</td>
                  <td className="p-4 capitalize">
                    <span
                      className={
                        payment.status === "approved"
                          ? "text-neon-green font-semibold"
                          : payment.status === "rejected"
                          ? "text-red-400"
                          : payment.status === "rolled_back"
                          ? "text-gray-400 italic font-medium"
                          : "text-yellow-400"
                      }
                    >
                      {payment.status === "rolled_back" ? "Rolled Back" : payment.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{payment.createdAt?.toLocaleDateString()}</td>
                  <td className="p-4">
                    {payment.status === "approved" && (
                      <RollbackButton
                        paymentId={payment.id}
                        customerName={payment.user?.name ?? null}
                        amount={payment.amount}
                        rollbackAction={rollbackAction}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer showing count and pagination */}
      {filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
