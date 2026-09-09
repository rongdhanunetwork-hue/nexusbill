"use client";

import { useState } from "react";
import { Wifi, Plus, Trash2, Printer, Search, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function HotspotClient({ packages, routers, vouchers, adminId }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [localVouchers, setLocalVouchers] = useState(vouchers || []);

  const [formData, setFormData] = useState({
    routerId: routers[0]?.id || "",
    packageId: packages[0]?.id || "",
    quantity: 10,
    prefix: "RNET",
    length: 6,
    limitUptime: "1d",
    limitBytesTotal: "",
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/hotspot/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate vouchers");
      
      alert(`Successfully generated ${data.vouchers.length} vouchers`);
      setLocalVouchers([...data.vouchers, ...localVouchers]);
      setIsGenerateModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredVouchers = localVouchers.filter((v: any) => 
    v.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
              <Wifi className="w-6 h-6 text-cyan-400" />
            </div>
            Hotspot Manager
          </h1>
          <p className="text-gray-400 mt-2">Generate and manage Hotspot PINs/Vouchers for Wi-Fi zones.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2 print:hidden">
            <Printer size={16} /> Print Vouchers
          </button>
          <button onClick={() => setIsGenerateModalOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl shadow-lg shadow-cyan-500/20 text-sm font-medium transition-all flex items-center gap-2 print:hidden">
            <Plus size={16} /> Generate Vouchers
          </button>
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-xl print:shadow-none print:border-none">
        <div className="p-4 border-b border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by PIN/Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1f2937] border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1f2937] text-gray-400 border-b border-gray-800 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">PIN / Code</th>
                <th className="px-6 py-4 font-semibold">Package</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredVouchers.map((voucher: any) => {
                const pkg = packages.find((p: any) => p.id === voucher.packageId);
                return (
                  <tr key={voucher.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-lg font-bold text-cyan-400">{voucher.code}</div>
                      {voucher.password && <div className="text-xs text-gray-500 mt-1">Pass: {voucher.password}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{pkg?.name || "Unknown"}</span>
                    </td>
                    <td className="px-6 py-4 text-green-400 font-medium">৳{voucher.price}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        voucher.status === 'unused' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        voucher.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {voucher.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {format(new Date(voucher.createdAt), "dd MMM yyyy, p")}
                    </td>
                  </tr>
                );
              })}
              {filteredVouchers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No vouchers found. Click "Generate Vouchers" to create some.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print View Only */}
      <div className="hidden print:grid print:grid-cols-4 print:gap-4 w-full">
        {filteredVouchers.map((voucher: any) => {
           const pkg = packages.find((p: any) => p.id === voucher.packageId);
           return (
             <div key={voucher.id} className="border-2 border-black p-4 rounded-xl text-center space-y-2">
               <div className="text-xl font-black">WiFi Hotspot</div>
               <div className="text-3xl font-mono font-bold tracking-widest">{voucher.code}</div>
               <div className="text-sm font-semibold">{pkg?.name} - ৳{voucher.price}</div>
             </div>
           );
        })}
      </div>

      <AnimatePresence>
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !generating && setIsGenerateModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-lg relative z-10 shadow-2xl border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">Generate Vouchers</h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Router</label>
                    <select required value={formData.routerId} onChange={e => setFormData({...formData, routerId: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-500">
                      <option value="">Select Router</option>
                      {routers.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.ipAddress})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Package</label>
                    <select required value={formData.packageId} onChange={e => setFormData({...formData, packageId: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-500">
                      <option value="">Select Package</option>
                      {packages.map((p: any) => <option key={p.id} value={p.id}>{p.name} - ৳{p.price}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                    <input type="number" min="1" max="500" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">PIN Length</label>
                    <input type="number" min="4" max="12" required value={formData.length} onChange={e => setFormData({...formData, length: parseInt(e.target.value)})} className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Prefix (Optional)</label>
                    <input type="text" value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value.toUpperCase()})} placeholder="e.g. RNET" className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Uptime Limit</label>
                    <input type="text" required value={formData.limitUptime} onChange={e => setFormData({...formData, limitUptime: e.target.value})} placeholder="e.g. 1d, 1h" className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-500" />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsGenerateModalOpen(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={generating} className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-bold transition-colors shadow-lg shadow-cyan-500/25 disabled:opacity-50">
                    {generating ? "Generating..." : "Generate Vouchers"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .min-h-screen { background: none !important; }
        }
      `}</style>
    </div>
  );
}
