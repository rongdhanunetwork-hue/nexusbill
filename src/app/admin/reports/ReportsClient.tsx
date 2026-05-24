"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, TrendingUp, Users, DollarSign, ArrowDown, ArrowUp, Calendar
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

interface Props {
  approvedPayments: Payment[];
  dueInvoices: Invoice[];
  customers: Customer[];
}

export default function ReportsClient({ approvedPayments, dueInvoices, customers }: Props) {
  const [reportType, setReportType] = useState<"income" | "due" | "customer">("income");

  const totalIncome = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDues = dueInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-8">
      {/* Cards Row */}
      <div className="grid md:grid-cols-3 gap-6">
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
      </div>

      {/* Report Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white capitalize">
            {reportType === "income" && "Income Report (Received Payments)"}
            {reportType === "due" && "Dues Report (Unpaid Invoices)"}
            {reportType === "customer" && "Customer Database Summary"}
          </h2>
          <span className="text-xs text-gray-400">
            {reportType === "income" && `${approvedPayments.length} entries`}
            {reportType === "due" && `${dueInvoices.length} unpaid`}
            {reportType === "customer" && `${customers.length} total`}
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
          )}

          {reportType === "customer" && (
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
          )}
        </div>
      </div>
    </div>
  );
}
