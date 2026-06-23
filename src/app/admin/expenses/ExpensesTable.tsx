"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Trash2 } from "lucide-react";

interface Expense {
  id: number;
  category: string;
  amount: string;
  note: string | null;
  expenseDate: string;
}

const CATEGORIES = [
  { value: "bandwidth", label: "Bandwidth Cost" },
  { value: "tower", label: "Tower / Infrastructure" },
  { value: "office", label: "Office Expenses" },
  { value: "salary", label: "Employee Salary" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

export default function ExpensesTable({ expenses, deleteAction }: { expenses: Expense[], deleteAction: (formData: FormData) => Promise<void> }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  if (expenses.length === 0) {
    return <tr><td colSpan={5} className="p-8 text-center text-gray-500">No expense records yet.</td></tr>;
  }

  const paginated = expenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      {paginated.map(e => (
        <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
          <td className="p-4 text-gray-300">{new Date(e.expenseDate).toLocaleDateString("en-BD")}</td>
          <td className="p-4">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
              {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
            </span>
          </td>
          <td className="p-4 text-gray-400 max-w-xs truncate">{e.note || "—"}</td>
          <td className="p-4 text-right font-bold text-red-400">৳{Number(e.amount).toFixed(2)}</td>
          <td className="p-4 text-center">
            <form action={deleteAction}>
              <input type="hidden" name="id" value={e.id} />
              <button type="submit" className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition cursor-pointer">
                <Trash2 size={14} />
              </button>
            </form>
          </td>
        </tr>
      ))}
      {expenses.length > 0 && (
        <tr>
          <td colSpan={5} className="p-0 border-none">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(expenses.length / pageSize)}
              totalItems={expenses.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </td>
        </tr>
      )}
    </>
  );
}
