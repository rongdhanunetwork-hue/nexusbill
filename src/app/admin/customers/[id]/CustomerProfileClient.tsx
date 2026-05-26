"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Edit, Phone, MapPin, Wifi, Package, CreditCard, Image, IdCard, 
  ArrowLeft, Download, Upload, Clock, FileText, CheckCircle2, 
  Printer, Activity
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ReactNode } from "react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  photoUrl: string | null;
  nidUrl: string | null;
  pppoeUsername: string | null;
  package?: { name: string; speed: string; price: string } | null;
  status: string | null;
  role: string;
}

interface Payment {
  id: number;
  amount: string;
  method: string | null;
  status: string | null;
  createdAt: string | Date | null;
}

interface Invoice {
  id: number;
  amount: string;
  status: string | null;
  dueDate: string | Date | null;
}

interface UsageRecord {
  recordedAt: string | Date | null;
  downloadGb: number | string;
  uploadGb: number | string;
}

export default function CustomerProfileClient({
  customer,
  payments,
  invoices,
  usageHistory,
  isOnline
}: {
  customer: Customer;
  payments: Payment[];
  invoices: Invoice[];
  usageHistory: UsageRecord[];
  isOnline: boolean;
}) {

  // Print PDF function
  function handleDownloadPDF() {
    const originalTitle = document.title;
    // Set title to customer name so browser print defaults filename to it
    const safeName = customer.name.trim().replace(/\s+/g, "_");
    document.title = `${safeName}_Profile_Details`;
    
    window.print();
    
    // Restore original title
    document.title = originalTitle;
  }

  // Format data usage history for the chart
  const chartData = usageHistory.map((u) => {
    const dateLabel = u.recordedAt 
      ? new Date(u.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "N/A";
    return {
      name: dateLabel,
      download: parseFloat(String(u.downloadGb || 0)),
      upload: parseFloat(String(u.uploadGb || 0)),
    };
  });

  const totalDownload = chartData.reduce((sum, d) => sum + d.download, 0).toFixed(2);
  const totalUpload = chartData.reduce((sum, d) => sum + d.upload, 0).toFixed(2);

  return (
    <div className="space-y-8 max-w-5xl print-container">
      {/* Print-only CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide sidebar, top header, page margins and buttons */
          header, nav, aside, button, .glass-button, .sidebar, .no-print, [role="navigation"] {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: sans-serif !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          .glass-card {
            background: none !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            color: black !important;
          }
          .text-white, h1, h2, h3, h4, span, p {
            color: black !important;
          }
          .text-gray-400, .text-gray-500 {
            color: #4b5563 !important;
          }
          .bg-white\\/5 {
            background-color: #f3f4f6 !important;
            border: 1px solid #e5e7eb !important;
          }
          /* Grid systems print fix */
          .grid {
            display: grid !important;
          }
        }
      `}} />

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link href="/admin/customers" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-wide">Customer Profile</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="glass-button px-4 py-2 text-neon-green border-neon-green/30 flex items-center gap-2"
          >
            <Printer size={18} /> Download PDF
          </button>
          <Link href={`/admin/customers/${customer.id}/edit`} className="glass-button px-4 py-2 text-neon-blue border-neon-blue/30 flex items-center gap-2">
            <Edit size={18} /> Edit Customer
          </Link>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center flex flex-col justify-center items-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-neon-blue to-purple-500 flex items-center justify-center mb-4 text-4xl font-bold text-white shadow-lg">
            {customer.photoUrl ? (
              <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              customer.name.charAt(0).toUpperCase()
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
          <p className="text-gray-400 capitalize">{customer.role}</p>
          <div className="mt-4 flex gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
              customer.status === "expired" 
                ? "bg-orange-500/20 text-orange-400 border-orange-500/30" 
                : "bg-neon-green/20 text-neon-green border-neon-green/30"
            }`}>
              {customer.status || "active"}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
              isOnline 
                ? "bg-neon-green/20 text-neon-green border-neon-green/30" 
                : "bg-red-500/20 text-red-400 border-red-500/30"
            }`}>
              {isOnline ? <><Activity size={10} /> Online</> : "Offline"}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-5 border-b border-white/10 pb-2">Account Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Info icon={<Phone size={18} />} label="Phone Number" value={customer.phone} />
            <Info icon={<MapPin size={18} />} label="Address" value={customer.address || "Not set"} />
            <Info icon={<Wifi size={18} />} label="PPPoE Username" value={customer.pppoeUsername || "Not set"} />
            <Info icon={<Package size={18} />} label="Package" value={`${customer.package?.name || "None"} ${customer.package?.speed ? `(${customer.package.speed})` : ""}`} />
            <Info icon={<CreditCard size={18} />} label="Price" value={customer.package?.price ? `৳${customer.package.price}` : "N/A"} />
            <Info icon={<IdCard size={18} />} label="NID Document" value={customer.nidUrl ? "Uploaded" : "Not uploaded"} />
          </div>
        </div>
      </div>

      {/* Usage Cards & Graph */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-5 border-b border-white/10 pb-2 flex items-center justify-between">
          <span>Data Usage History</span>
          <span className="text-xs text-gray-400 no-print">Cumulative: Down {totalDownload} GB / Up {totalUpload} GB</span>
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
            <div className="text-neon-green"><Download size={20} /></div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Downloaded</p>
              <p className="text-xl font-bold text-white">{totalDownload} GB</p>
            </div>
          </div>
          <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
            <div className="text-neon-blue"><Upload size={20} /></div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Uploaded</p>
              <p className="text-xl font-bold text-white">{totalUpload} GB</p>
            </div>
          </div>
        </div>
        <div className="h-64 w-full no-print">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#39ff14" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#39ff14" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} unit="GB" />
              <Tooltip contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="download" stroke="#39ff14" strokeWidth={2} fillOpacity={1} fill="url(#downGrad)" name="Download (GB)" />
              <Area type="monotone" dataKey="upload" stroke="#00f3ff" strokeWidth={2} fillOpacity={1} fill="url(#upGrad)" name="Upload (GB)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment & Invoice Lists */}
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-2">
            <CreditCard size={18} className="text-neon-green" />
            <h3 className="text-white font-semibold">Payment History</h3>
          </div>
          <div className="divide-y divide-white/5">
            {payments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No payment records</div>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="p-4 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-white font-medium">৳{p.amount}</span>
                    <span className="text-gray-400 text-xs ml-2">({p.method || "N/A"})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      p.status === "approved" ? "text-neon-green bg-neon-green/10" : "text-orange-400 bg-orange-500/10"
                    }`}>
                      {p.status || "pending"}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-2">
            <FileText size={18} className="text-neon-blue" />
            <h3 className="text-white font-semibold">Invoices</h3>
          </div>
          <div className="divide-y divide-white/5">
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No invoice records</div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="p-4 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-white font-medium">INV-{inv.id}</span>
                    <span className="text-gray-400 text-xs ml-2">৳{inv.amount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      inv.status === "paid" ? "text-neon-green bg-neon-green/10" : "text-red-400 bg-red-500/10"
                    }`}>
                      {inv.status || "unpaid"}
                    </span>
                    <span className="text-gray-400 text-xs">
                      Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-white/5 rounded-xl flex items-start gap-3 border border-white/5">
      <div className="text-neon-blue mt-1">{icon}</div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  );
}
