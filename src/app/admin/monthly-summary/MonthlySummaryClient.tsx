"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Calendar, DollarSign, Users, Trash2, ArrowLeft, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePopup } from "@/components/ui/PopupProvider";

export default function MonthlySummaryClient({ initialData }: { initialData: any[] }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { showConfirm, showAlert } = usePopup();

  const handleDelete = async (monthYear: string) => {
    const isConfirm = await showConfirm({
      title: "Delete Records",
      message: `Are you sure you want to DELETE all records (Payments, Expenses, and Invoices) for ${monthYear}? This action CANNOT be undone and will permanently remove the data.`,
      danger: true,
      confirmText: "Delete"
    });
    if (!isConfirm) return;

    setIsDeleting(monthYear);
    try {
      const res = await fetch(`/api/admin/monthly-summary/${monthYear}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete records");
      }

      setData(prev => prev.filter(m => m.monthYear !== monthYear));
      router.refresh();
      await showAlert({ title: "Deleted", message: `Records for ${monthYear} deleted successfully.`, type: "success" });
    } catch (err) {
      console.error(err);
      await showAlert({ title: "Error", message: "Error deleting records. Please try again.", type: "error" });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Monthly Summary</h1>
          <p className="text-sm text-gray-400 mt-1">View and manage your historical accounts grouped by month.</p>
        </div>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-red-200">
          <strong className="text-red-400 block mb-1">Warning: Deletion is Permanent</strong>
          Deleting a month's summary will physically delete all <strong>Payments</strong>, <strong>Invoices</strong>, and <strong>Expenses</strong> created during that month to free up database space. Ensure you no longer need these records before deleting.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white/5 rounded-xl border border-white/10">
            No monthly data found.
          </div>
        ) : (
          data.map((month, index) => {
            const netBalance = month.totalIncome - month.totalExpense;
            const isProfit = netBalance >= 0;

            // Format YYYY-MM to readable month (e.g., 2026-05 -> May 2026)
            const [year, m] = month.monthYear.split("-");
            const dateObj = new Date(parseInt(year), parseInt(m) - 1, 1);
            const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

            return (
              <Link
                href={`/admin/monthly-summary/${month.monthYear}`}
                key={month.monthYear}
                className="block group"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-6 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer"
                >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                      <Calendar size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{monthName}</h3>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(month.monthYear);
                    }}
                    disabled={isDeleting === month.monthYear}
                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 disabled:opacity-50"
                    title="Delete all records for this month"
                  >
                    {isDeleting === month.monthYear ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm flex items-center gap-2"><DollarSign size={14} className="text-neon-green" /> Total Income</span>
                    <span className="text-white font-mono font-bold text-lg">৳{month.totalIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm flex items-center gap-2"><DollarSign size={14} className="text-pink-400" /> Total Expense</span>
                    <span className="text-white font-mono font-bold text-lg">৳{month.totalExpense.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-gray-400 text-sm flex items-center gap-2"><TrendingUp size={14} className={isProfit ? "text-teal-400" : "text-orange-400"} /> Net Balance</span>
                    <span className={`font-mono font-bold text-lg ${isProfit ? "text-teal-400" : "text-orange-400"}`}>
                      {isProfit ? "+" : ""}৳{netBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm flex items-center gap-2"><Users size={14} className="text-indigo-400" /> New Customers</span>
                    <span className="text-white font-mono font-bold">{month.newCustomers}</span>
                  </div>
                </div>
                
                {/* Background glow based on profit/loss */}
                <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none ${isProfit ? 'bg-teal-500' : 'bg-red-500'}`} />
                </motion.div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
