"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";

interface Invoice {
  id: number;
  amount: string;
  dueDate: Date | null;
  status: string | null;
  user?: {
    name: string;
  } | null;
}

export default function DueInvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  if (invoices.length === 0) {
    return <tr><td colSpan={5} className="p-8 text-center text-gray-500">No due invoices.</td></tr>;
  }

  const paginated = invoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      {paginated.map(invoice => (
        <tr key={invoice.id} className="hover:bg-white/5">
          <td className="p-4 text-white font-mono">INV-{invoice.id}</td>
          <td className="p-4 text-gray-300">{invoice.user?.name}</td>
          <td className="p-4 text-white font-bold">৳{invoice.amount}</td>
          <td className="p-4 text-gray-400">{invoice.dueDate?.toLocaleDateString()}</td>
          <td className="p-4 text-orange-400 capitalize">{invoice.status}</td>
        </tr>
      ))}
      {invoices.length > 0 && (
        <tr>
          <td colSpan={5} className="p-0 border-none">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(invoices.length / pageSize)}
              totalItems={invoices.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </td>
        </tr>
      )}
    </>
  );
}
