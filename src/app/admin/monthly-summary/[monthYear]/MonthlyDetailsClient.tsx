"use client";

import { useState } from "react";
import { ArrowLeft, Download, DollarSign, TrendingDown, Users, CheckCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function MonthlyDetailsClient({
  monthYear,
  payments,
  expenses,
  newCustomers,
}: {
  monthYear: string;
  payments: any[];
  expenses: any[];
  newCustomers: any[];
}) {
  const [activeTab, setActiveTab] = useState<"payments" | "expenses" | "customers">("payments");

  // Format monthYear to readable string (e.g., "May 2026")
  const [year, m] = monthYear.split("-");
  const dateObj = new Date(parseInt(year), parseInt(m) - 1, 1);
  const monthName = dateObj.toLocaleString("default", { month: "long", year: "numeric" });

  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netBalance = totalIncome - totalExpense;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print-container pb-20">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 print:border-black/20 print:pb-2">
        <div className="flex items-center gap-4">
          <Link href="/admin/monthly-summary" className="text-gray-400 hover:text-white transition-colors print:hidden">
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide print:text-black">
              Monthly Details: {monthName}
            </h1>
            <p className="text-sm text-gray-400 mt-1 print:text-gray-600">
              Detailed breakdown of recharges, expenses, and new customers.
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="print:hidden flex items-center gap-2 px-4 py-2 bg-neon-blue text-white rounded-lg font-semibold hover:bg-neon-blue/80 transition-colors shadow-lg shadow-neon-blue/20"
        >
          <Download size={18} />
          <span>Save as PDF</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="glass-card p-4 rounded-xl print:border print:border-gray-300 print:shadow-none">
          <p className="text-gray-400 text-sm print:text-gray-600">Total Income</p>
          <p className="text-2xl font-bold text-neon-green print:text-green-700">৳{totalIncome.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4 rounded-xl print:border print:border-gray-300 print:shadow-none">
          <p className="text-gray-400 text-sm print:text-gray-600">Total Expense</p>
          <p className="text-2xl font-bold text-pink-400 print:text-red-700">৳{totalExpense.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4 rounded-xl print:border print:border-gray-300 print:shadow-none">
          <p className="text-gray-400 text-sm print:text-gray-600">Net Balance</p>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-teal-400 print:text-teal-700" : "text-orange-400 print:text-orange-700"}`}>
            ৳{netBalance.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4 rounded-xl print:border print:border-gray-300 print:shadow-none">
          <p className="text-gray-400 text-sm print:text-gray-600">New Customers</p>
          <p className="text-2xl font-bold text-indigo-400 print:text-indigo-700">{newCustomers.length}</p>
        </div>
      </div>

      {/* Tabs (Hidden in Print) */}
      <div className="flex gap-4 border-b border-white/10 print:hidden">
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "payments" ? "border-neon-blue text-neon-blue" : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <DollarSign size={18} /> Recharges ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "expenses" ? "border-pink-400 text-pink-400" : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <TrendingDown size={18} /> Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "customers" ? "border-indigo-400 text-indigo-400" : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Users size={18} /> New Customers ({newCustomers.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="glass-card overflow-hidden print:border-none print:shadow-none print:bg-transparent">
        
        {/* Payments Table */}
        <div className={activeTab === "payments" ? "block print:block print:mb-8" : "hidden print:block print:mb-8"}>
          <h3 className="hidden print:block text-xl font-bold text-black mb-2 mt-6 border-b border-black/20 pb-2">Recharges (Income)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left print:text-black print:excel-table">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 print:bg-gray-100 print:border-black text-xs text-gray-400 print:text-black uppercase tracking-wider">
                  <th className="p-4 print:excel-th">Date</th>
                  <th className="p-4 print:excel-th">Customer</th>
                  <th className="p-4 print:excel-th">Method</th>
                  <th className="p-4 print:excel-th">TrxID</th>
                  <th className="p-4 print:excel-th">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-300">
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-500 print:excel-td">No recharges this month.</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-xs print:excel-td">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="p-4 font-bold print:excel-td">{p.user?.name || "Unknown"}</td>
                      <td className="p-4 uppercase text-xs print:excel-td">{p.method}</td>
                      <td className="p-4 font-mono text-xs text-gray-400 print:text-gray-700 print:excel-td">{p.transactionId || "N/A"}</td>
                      <td className="p-4 font-bold text-neon-green print:text-green-700 print:excel-td">৳{p.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Table */}
        <div className={activeTab === "expenses" ? "block print:block print:mb-8" : "hidden print:block print:mb-8"}>
          <h3 className="hidden print:block text-xl font-bold text-black mb-2 mt-6 border-b border-black/20 pb-2">Expenses</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left print:text-black print:excel-table">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 print:bg-gray-100 print:border-black text-xs text-gray-400 print:text-black uppercase tracking-wider">
                  <th className="p-4 print:excel-th">Date</th>
                  <th className="p-4 print:excel-th">Category</th>
                  <th className="p-4 print:excel-th">Note</th>
                  <th className="p-4 print:excel-th">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-300">
                {expenses.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500 print:excel-td">No expenses this month.</td></tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-xs print:excel-td">{new Date(e.expenseDate).toLocaleDateString()}</td>
                      <td className="p-4 font-bold capitalize print:excel-td">{e.category}</td>
                      <td className="p-4 text-sm text-gray-300 print:text-gray-700 print:excel-td">{e.note || "N/A"}</td>
                      <td className="p-4 font-bold text-pink-400 print:text-red-700 print:excel-td">৳{e.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Customers Table */}
        <div className={activeTab === "customers" ? "block print:block print:mb-8" : "hidden print:block print:mb-8"}>
          <h3 className="hidden print:block text-xl font-bold text-black mb-2 mt-6 border-b border-black/20 pb-2">New Customers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left print:text-black print:excel-table">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 print:bg-gray-100 print:border-black text-xs text-gray-400 print:text-black uppercase tracking-wider">
                  <th className="p-4 print:excel-th">Join Date</th>
                  <th className="p-4 print:excel-th">Name</th>
                  <th className="p-4 print:excel-th">Phone</th>
                  <th className="p-4 print:excel-th">Package</th>
                  <th className="p-4 print:excel-th">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-300">
                {newCustomers.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-500 print:excel-td">No new customers this month.</td></tr>
                ) : (
                  newCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-xs print:excel-td">{new Date(c.createdAt).toLocaleString()}</td>
                      <td className="p-4 font-bold print:excel-td">{c.name}</td>
                      <td className="p-4 font-mono text-xs print:excel-td">{c.phone}</td>
                      <td className="p-4 text-xs font-semibold text-neon-blue print:text-blue-700 print:excel-td">{c.package?.name || "No Plan"}</td>
                      <td className="p-4 font-bold text-white print:text-black print:excel-td">৳{c.connectionFee || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
