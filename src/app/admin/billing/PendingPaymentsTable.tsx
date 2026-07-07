"use client";

import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/Pagination";

interface Payment {
  id: number;
  userId: number | null;
  amount: string;
  method: string | null;
  trxId: string | null;
  screenshotUrl: string | null;
  user?: {
    name: string;
    phone: string;
    role: string | null;
  } | null;
}

export default function PendingPaymentsTable({ payments, approveAction, rejectAction }: { payments: Payment[], approveAction: (formData: FormData) => Promise<void>, rejectAction: (formData: FormData) => Promise<void> }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  useEffect(() => {
    const saved = localStorage.getItem('isp_page_size');
    if (saved) setPageSize(Number(saved));
  }, []);

  if (payments.length === 0) {
    return <tr><td colSpan={6} className="p-8 text-center text-gray-500">No pending payments.</td></tr>;
  }

  const paginated = payments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      {paginated.map(payment => (
        <tr key={payment.id} className="hover:bg-white/5">
          <td className="p-4">
            <div className="font-medium text-white">
              {payment.user?.name || "Unknown"}
              {payment.user?.role === "reseller" && <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">Reseller Credit</span>}
            </div>
            <div className="text-sm text-gray-400">{payment.user?.phone}</div>
          </td>
          <td className="p-4 text-white font-bold">৳{payment.amount}</td>
          <td className="p-4 text-gray-300 capitalize">{payment.method || "N/A"}</td>
          <td className="p-4 text-neon-blue font-mono">{payment.trxId || "N/A"}</td>
          <td className="p-4 text-gray-400">
            {payment.screenshotUrl ? (
              <a href={payment.screenshotUrl} target="_blank" rel="noreferrer" className="text-neon-blue hover:underline flex items-center gap-1">
                View Image
              </a>
            ) : "No"}
          </td>
          <td className="p-4">
            <div className="flex gap-2">
              <form action={approveAction}>
                <input type="hidden" name="paymentId" value={payment.id} />
                <input type="hidden" name="userId" value={payment.userId || ""} />
                <input type="hidden" name="amount" value={payment.amount} />
                <button className="px-3 py-1.5 bg-neon-green/20 text-neon-green rounded-lg text-sm border border-neon-green/30 cursor-pointer">Approve</button>
              </form>
              <form action={rejectAction}>
                <input type="hidden" name="paymentId" value={payment.id} />
                <button className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/30 cursor-pointer">Reject</button>
              </form>
            </div>
          </td>
        </tr>
      ))}
      {payments.length > 0 && (
        <tr>
          <td colSpan={6} className="p-0 border-none">
            <Pagination
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            localStorage.setItem('isp_page_size', newSize.toString());
            // @ts-ignore
            if (typeof setCurrentPage !== 'undefined') setCurrentPage(1);
            // @ts-ignore
            if (typeof setCurrentActivePage !== 'undefined') setCurrentActivePage(1);
            // @ts-ignore
            if (typeof setCurrentSecretsPage !== 'undefined') setCurrentSecretsPage(1);
            // @ts-ignore
            if (typeof setRoutersPage !== 'undefined') setRoutersPage(1);
          }}
              currentPage={currentPage}
              totalPages={Math.ceil(payments.length / pageSize)}
              totalItems={payments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </td>
        </tr>
      )}
    </>
  );
}
