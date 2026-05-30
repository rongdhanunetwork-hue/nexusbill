"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, TrendingUp, Users, DollarSign, ArrowDown, ArrowUp, Calendar, TrendingDown, MessageSquare, Loader2
} from "lucide-react";

interface Payment {
  id: number;
  amount: string;
  trxId: string | null;
  method: string | null;
  status: string | null;
  createdAt: Date | null;
  user?: {
    name: string;
    phone: string;
  } | null;
}

interface Invoice {
  id: number;
  amount: string;
  status: string | null;
  dueDate: Date | null;
  createdAt: Date | null;
  user?: {
    name: string;
    phone: string;
  } | null;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  status: string | null;
  createdAt: Date | null;
}

interface Transaction {
  id: number;
  resellerId: number;
  customerId: number | null;
  amount: string;
  type: string;
  createdAt: Date | null;
  reseller?: {
    name: string;
    phone: string;
  } | null;
  customer?: {
    name: string;
    phone: string;
  } | null;
}

interface Expense {
  id: number;
  category: string;
  amount: string;
  note: string | null;
  expenseDate: string;
  createdAt: Date | null;
}

interface Props {
  approvedPayments: Payment[];
  dueInvoices: Invoice[];
  customers: Customer[];
  allTransactions?: Transaction[];
  allExpenses?: Expense[];
  role?: "admin" | "reseller" | "employee";
}

export default function ReportsClient({ approvedPayments, dueInvoices, customers, allTransactions = [], allExpenses = [], role = "admin" }: Props) {
  const [reportType, setReportType] = useState<"income" | "due" | "customer" | "ledger" | "expense">("income");
  const [bulkSmsLoading, setBulkSmsLoading] = useState(false);
  const [bulkSmsResult, setBulkSmsResult] = useState<string | null>(null);

  // Ledger Filter states
  const [filterReseller, setFilterReseller] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const totalIncome = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDues = dueInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

  // Expense calculations
  const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  async function handleBulkSMS() {
    setBulkSmsLoading(true);
    setBulkSmsResult(null);
    try {
      const res = await fetch("/api/admin/billing/bulk-sms-due", { method: "POST" });
      const data = await res.json();
      setBulkSmsResult(`✅ SMS পাঠানো হয়েছে: ${data.sent} জন | ব্যর্থ: ${data.failed} জন`);
    } catch {
      setBulkSmsResult("❌ SMS পাঠাতে সমস্যা হয়েছে");
    }
    setBulkSmsLoading(false);
  }

  // Extract unique resellers from transactions for filter dropdown
  const uniqueResellers = Array.from(
    new Map(
      allTransactions
        .map(tx => tx.reseller)
        .filter((r): r is { id: number; name: string; phone: string } => !!r)
        .map(r => [r.id, r])
    ).values()
  );

  // Filtered transactions
  const filteredTx = allTransactions.filter(tx => {
    const matchesReseller = !filterReseller || String(tx.resellerId) === filterReseller;
    const matchesType = !filterType || tx.type === filterType;
    
    let matchesDate = true;
    if (filterDate && tx.createdAt) {
      const txDate = new Date(tx.createdAt).toDateString();
      const searchDate = new Date(filterDate).toDateString();
      matchesDate = txDate === searchDate;
    }

    return matchesReseller && matchesType && matchesDate;
  });

  return (
    <div className="space-y-8">
      {/* Cards Row */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* Income Card */}
        <button
          onClick={() => setReportType("income")}
          className={`glass-card p-6 text-left transition-all relative overflow-hidden border ${
            reportType === "income" ? "border-neon-blue bg-white/10 ring-1 ring-neon-blue/20" : "border-white/5"
          }`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 rounded-xl bg-neon-blue/20 text-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.2)]">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold">Monthly Income Report</p>
              <p className="text-2xl font-bold text-white mt-1">৳{totalIncome.toLocaleString()}</p>
            </div>
          </div>
          {reportType === "income" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neon-blue" />
          )}
        </button>

        {/* Due Card */}
        <button
          onClick={() => setReportType("due")}
          className={`glass-card p-6 text-left transition-all relative overflow-hidden border ${
            reportType === "due" ? "border-orange-500 bg-white/10 ring-1 ring-orange-500/20" : "border-white/5"
          }`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 rounded-xl bg-orange-400/20 text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.2)]">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold">Due Amount Report</p>
              <p className="text-2xl font-bold text-white mt-1">৳{totalDues.toLocaleString()}</p>
            </div>
          </div>
          {reportType === "due" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500" />
          )}
        </button>

        {/* Customer Card */}
        <button
          onClick={() => setReportType("customer")}
          className={`glass-card p-6 text-left transition-all relative overflow-hidden border ${
            reportType === "customer" ? "border-neon-green bg-white/10 ring-1 ring-neon-green/20" : "border-white/5"
          }`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 rounded-xl bg-neon-green/20 text-neon-green shadow-[0_0_15px_rgba(57,255,20,0.2)]">
              <Users size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold">Customer Report</p>
              <p className="text-2xl font-bold text-white mt-1">{customers.length} Customers</p>
            </div>
          </div>
          {reportType === "customer" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neon-green" />
          )}
        </button>

        {/* Ledger Card */}
        <button
          onClick={() => setReportType("ledger")}
          className={`glass-card p-6 text-left transition-all relative overflow-hidden border ${
            reportType === "ledger" ? "border-purple-500 bg-white/10 ring-1 ring-purple-500/20" : "border-white/5"
          }`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold">Transaction Ledger</p>
              <p className="text-2xl font-bold text-white mt-1">{filteredTx.length} Entries</p>
            </div>
          </div>
          {reportType === "ledger" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
          )}
        </button>

        {/* Expense Card — Admin only */}
        {role === "admin" && (
          <button
            onClick={() => setReportType("expense")}
            className={`glass-card p-6 text-left transition-all relative overflow-hidden border ${
              reportType === "expense" ? "border-red-500 bg-white/10 ring-1 ring-red-500/20" : "border-white/5"
            }`}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 rounded-xl bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <TrendingDown size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-semibold">Expense Report</p>
                <p className="text-2xl font-bold text-white mt-1">৳{totalExpenses.toLocaleString()}</p>
              </div>
            </div>
            {reportType === "expense" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
            )}
          </button>
        )}
      </div>

      {/* Report Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white capitalize">
            {reportType === "income" && "Income Report (Received Payments)"}
            {reportType === "due" && "Dues Report (Unpaid Invoices)"}
            {reportType === "customer" && "Customer Database Summary"}
            {reportType === "ledger" && "Transaction Ledger Logs"}
            {reportType === "expense" && "Expense vs Income Report"}
          </h2>
          <span className="text-xs text-gray-400">
            {reportType === "income" && `${approvedPayments.length} entries`}
            {reportType === "due" && `${dueInvoices.length} unpaid`}
            {reportType === "customer" && `${customers.length} total`}
            {reportType === "ledger" && `${filteredTx.length} entries`}
            {reportType === "expense" && `Net: ${netProfit >= 0 ? "+" : ""}৳${netProfit.toLocaleString()}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportType === "income" && (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {approvedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No income history.</td>
                  </tr>
                ) : (
                  approvedPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="p-4">
                        <div className="font-bold text-white">{p.user?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-400">{p.user?.phone}</div>
                      </td>
                      <td className="p-4 text-neon-blue font-bold">৳{p.amount}</td>
                      <td className="p-4 text-gray-300 capitalize">{p.method}</td>
                      <td className="p-4 text-gray-400 font-mono text-sm">{p.trxId}</td>
                      <td className="p-4 text-gray-400">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {reportType === "due" && (
            <div>
              {/* Bulk SMS button for due customers */}
              {role === "admin" && dueInvoices.length > 0 && (
                <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between gap-4">
                  <p className="text-sm text-gray-400">{dueInvoices.length} জন customer-এর bill বাকি আছে। SMS reminder পাঠান:</p>
                  <button
                    onClick={handleBulkSMS}
                    disabled={bulkSmsLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-sm font-semibold hover:bg-yellow-500/30 transition disabled:opacity-50"
                  >
                    {bulkSmsLoading ? <><Loader2 size={14} className="animate-spin" /> পাঠাচ্ছি...</> : <><MessageSquare size={14} /> Bulk SMS Send</>}
                  </button>
                </div>
              )}
              {bulkSmsResult && (
                <div className={`px-5 py-3 text-sm border-b border-white/10 ${
                  bulkSmsResult.startsWith("✅") ? "text-neon-green bg-neon-green/5" : "text-red-400 bg-red-500/5"
                }`}>{bulkSmsResult}</div>
              )}
            <table className="w-full text-left">
                <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                  <th className="p-4">Invoice ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Due Amount</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dueInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No dues outstanding!</td>
                  </tr>
                ) : (
                  dueInvoices.map((i) => (
                    <tr key={i.id} className="hover:bg-white/5">
                      <td className="p-4 text-white font-mono text-sm">INV-{i.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-white">{i.user?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-400">{i.user?.phone}</div>
                      </td>
                      <td className="p-4 text-orange-400 font-bold">৳{i.amount}</td>
                      <td className="p-4 text-gray-300">{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "N/A"}</td>
                      <td className="p-4 text-gray-400">{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          )}

          {reportType === "customer" && (
            <div>
              <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-400">Download customer list formatted for BTRC compliance.</p>
                <a
                  href="/api/admin/reports/btrc"
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/30 text-sm font-semibold hover:bg-neon-blue/30 transition"
                >
                  <FileText size={14} /> Download BTRC Report (CSV)
                </a>
              </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">No customers registered.</td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5">
                      <td className="p-4 text-white font-bold">{c.name}</td>
                      <td className="p-4 text-gray-300 font-mono">{c.phone}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          c.status === "active" || c.status === "online"
                            ? "bg-neon-green/20 text-neon-green border border-neon-green/25"
                            : "bg-red-500/20 text-red-400 border border-red-500/25"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          )}

          {reportType === "ledger" && (
            <div>
              {/* Ledger Filters */}
              <div className="p-4 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                  {role !== "reseller" && (
                    <select
                      value={filterReseller}
                      onChange={(e) => setFilterReseller(e.target.value)}
                      className="glass-input bg-slate-800 text-xs px-3 py-2 text-white"
                    >
                      <option value="">All Resellers</option>
                      {uniqueResellers.map(r => (
                        <option key={r.id} value={String(r.id)}>{r.name}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="glass-input bg-slate-800 text-xs px-3 py-2 text-white"
                  >
                    <option value="">All Types</option>
                    <option value="credit_in">Credit In (Admin Add)</option>
                    <option value="recharge">Recharge (Customer)</option>
                    <option value="refund">Refund (Rollback)</option>
                  </select>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="glass-input bg-slate-800 text-xs px-3 py-2 text-white font-mono"
                  />
                  {(filterReseller || filterType || filterDate) && (
                    <button
                      onClick={() => { setFilterReseller(""); setFilterType(""); setFilterDate(""); }}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                    <th className="p-4">Tx ID</th>
                    {role !== "reseller" && <th className="p-4">Reseller</th>}
                    <th className="p-4">Details / Customer</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTx.length === 0 ? (
                    <tr>
                      <td colSpan={role === "reseller" ? 5 : 6} className="p-8 text-center text-gray-500">No transactions match the criteria.</td>
                    </tr>
                  ) : (
                    filteredTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 text-sm">
                        <td className="p-4 text-white font-mono">TX-{tx.id}</td>
                        {role !== "reseller" && (
                          <td className="p-4">
                            <div className="font-bold text-white">{tx.reseller?.name || `Reseller #${tx.resellerId}`}</div>
                            <div className="text-xs text-gray-400">{tx.reseller?.phone}</div>
                          </td>
                        )}
                        <td className="p-4 text-gray-300">
                          {tx.type === "credit_in" ? (
                            <span className="text-xs text-gray-450 italic">Credit added by Admin</span>
                          ) : tx.customer ? (
                            <div>
                              <span className="font-semibold text-white">{tx.customer.name}</span>
                              <span className="text-xs text-gray-400 block">{tx.customer.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-white font-bold">৳{tx.amount}</td>
                        <td className="p-4 capitalize">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.type === "credit_in" 
                              ? "bg-blue-500/20 text-blue-450" 
                              : tx.type === "recharge" 
                                ? "bg-neon-green/20 text-neon-green" 
                                : "bg-red-500/20 text-red-400"
                          }`}>
                            {tx.type === "credit_in" ? "credit in" : tx.type}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 font-mono text-xs">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === "expense" && (
            <div>
              {/* Summary Cards */}
              <div className="p-5 border-b border-white/10 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Total Income</p>
                  <p className="text-xl font-bold text-neon-green">৳{totalIncome.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Total Expenses</p>
                  <p className="text-xl font-bold text-red-400">৳{totalExpenses.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Net Profit</p>
                  <p className={`text-xl font-bold ${netProfit >= 0 ? "text-neon-blue" : "text-red-400"}`}>
                    {netProfit >= 0 ? "+" : ""}৳{netProfit.toLocaleString()}
                  </p>
                </div>
              </div>
              {/* Expense List */}
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                    <th className="p-4">Date</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Note</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allExpenses.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No expense records yet. Add from Expenses page.</td></tr>
                  ) : (
                    allExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-white/5">
                        <td className="p-4 text-gray-300">{new Date(e.expenseDate).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30 capitalize">
                            {e.category}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 max-w-xs truncate">{e.note || "—"}</td>
                        <td className="p-4 text-right font-bold text-red-400">৳{Number(e.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
