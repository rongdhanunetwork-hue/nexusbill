"use client";

import { useState } from "react";
import { Upload, CheckCircle2, Loader2, Image as ImageIcon, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  bkashNumber: string;
  bkashNumber2: string;
  bankCardNumber: string;
  packagePrice: string;
  packageName: string;
  pppoeId?: string;
  customerName?: string;
  billDate?: string;
  newBillDate?: string;
}

export default function PayBillClient({ 
  bkashNumber, 
  bkashNumber2, 
  bankCardNumber, 
  packagePrice, 
  packageName,
  pppoeId,
  customerName,
  billDate,
  newBillDate
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setScreenshotUrl(data.url);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      alert("Network error during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const trxId = String(form.get("trxId") || "").trim();
    const amount = String(form.get("amount") || "").trim();
    const method = String(form.get("method") || "bkash");

    if (trxId.length < 5 || !amount) {
      setError("Transaction ID and amount required.");
      return;
    }
    if (!screenshotUrl) {
      setError("Payment screenshot is mandatory.");
      return;
    }
    if (parseFloat(amount) !== parseFloat(packagePrice)) {
      setError(`You must pay exactly ৳${packagePrice}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/customer/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trxId, amount, method, screenshotUrl }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Submit failed.");
      else setSubmitted(true);
    } catch {
      setError("Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isBkashLoading, setIsBkashLoading] = useState(false);

  const handleBkashAutoPay = async () => {
    try {
      setIsBkashLoading(true);
      setError(null);
      const res = await fetch("/api/bkash/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: packagePrice }),
      });
      const data = await res.json();
      if (data.bkashURL) {
        window.location.href = data.bkashURL;
      } else {
        setError(data.error || "Failed to initiate payment");
      }
    } catch (err) {
      setError("Network error connecting to bKash");
    } finally {
      setIsBkashLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-bold text-white mb-8 text-center tracking-tight flex items-center justify-center gap-3">
        <FileText className="text-neon-blue" size={32} />
        Payment Invoice
      </motion.h1>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 text-center relative overflow-hidden">
             <CheckCircle2 className="w-20 h-20 text-neon-green mx-auto mb-6" />
             <h2 className="text-2xl font-bold text-white mb-4">Payment Submitted!</h2>
             <p className="text-gray-400">Your manual payment is under review. Please wait for admin approval.</p>
          </motion.div>
        ) : (
          <motion.div key="invoice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            
            {/* INVOICE CARD */}
            <div className="glass-card overflow-hidden shadow-2xl border border-white/10">
              <div className="bg-gradient-to-r from-neon-blue/20 via-[#e2136e]/20 to-neon-blue/20 py-5 text-center border-b border-white/10">
                <h2 className="text-2xl font-bold text-white tracking-wide uppercase">Payment by bKash</h2>
              </div>
              
              <div className="flex flex-col divide-y divide-white/5">
                <div className="flex flex-col sm:flex-row hover:bg-white/5 transition-colors">
                  <div className="sm:w-1/3 p-4 font-semibold text-gray-400 bg-white/5">PPPoE Id</div>
                  <div className="sm:w-2/3 p-4 text-white font-bold tracking-wide">{pppoeId}</div>
                </div>
                <div className="flex flex-col sm:flex-row hover:bg-white/5 transition-colors">
                  <div className="sm:w-1/3 p-4 font-semibold text-gray-400 bg-white/5">Customer Name</div>
                  <div className="sm:w-2/3 p-4 text-white font-medium">{customerName}</div>
                </div>
                <div className="flex flex-col sm:flex-row hover:bg-white/5 transition-colors">
                  <div className="sm:w-1/3 p-4 font-semibold text-gray-400 bg-white/5">Bill Date</div>
                  <div className="sm:w-2/3 p-4 text-red-400 font-medium">{billDate}</div>
                </div>
                <div className="flex flex-col sm:flex-row hover:bg-white/5 transition-colors">
                  <div className="sm:w-1/3 p-4 font-semibold text-neon-green bg-white/5">New Bill Date</div>
                  <div className="sm:w-2/3 p-4 text-neon-green font-bold">{newBillDate}</div>
                </div>
                <div className="flex flex-col sm:flex-row hover:bg-white/5 transition-colors">
                  <div className="sm:w-1/3 p-4 font-semibold text-gray-400 bg-white/5">Package</div>
                  <div className="sm:w-2/3 p-4 text-white font-medium">{packageName}</div>
                </div>
                <div className="flex flex-col sm:flex-row hover:bg-white/5 transition-colors">
                  <div className="sm:w-1/3 p-4 font-semibold text-gray-400 bg-white/5">Price</div>
                  <div className="sm:w-2/3 p-4 text-white font-medium">৳ {packagePrice}</div>
                </div>
                <div className="flex flex-col sm:flex-row hover:bg-white/5 transition-colors">
                  <div className="sm:w-1/3 p-4 font-semibold text-gray-400 bg-white/5">Gateway Charge</div>
                  <div className="sm:w-2/3 p-4 text-white font-medium">৳ 0</div>
                </div>
                <div className="flex flex-col sm:flex-row bg-neon-blue/10 border-t border-neon-blue/30">
                  <div className="sm:w-1/3 p-5 font-bold text-neon-blue text-lg">Total Payable</div>
                  <div className="sm:w-2/3 p-5 text-neon-blue font-black text-2xl">৳ {packagePrice}</div>
                </div>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center font-medium shadow-lg">
                {error}
              </motion.div>
            )}

            <div className="flex flex-col items-center justify-center gap-6 pt-4">
              <button 
                onClick={handleBkashAutoPay}
                disabled={isBkashLoading}
                className="group relative overflow-hidden bg-[#e2136e] text-white px-10 py-4 rounded-xl shadow-[0_0_40px_-10px_#e2136e] flex items-center justify-center gap-4 w-full max-w-sm transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                {isBkashLoading ? <Loader2 className="animate-spin relative z-10" size={24} /> : null}
                <span className="font-bold text-xl relative z-10 tracking-wide">Pay with bKash</span>
              </button>
            </div>

            <div className="mt-16 text-center">
              <button 
                onClick={() => setShowManual(!showManual)} 
                className="text-gray-400 hover:text-white text-sm font-medium px-6 py-2 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all"
              >
                {showManual ? "Hide Manual Payment Options" : "Or pay manually (Send Money / Bank)"}
              </button>
            </div>

            {showManual && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2">
                <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-6">
                  <h3 className="text-xl font-bold text-white mb-4">Manual Submission</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Payment Method</label>
                      <select name="method" className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white border border-white/10">
                        <option value="bkash">bKash ({bkashNumber})</option>
                        {bkashNumber2 && <option value="bkash2">bKash 2 ({bkashNumber2})</option>}
                        {bankCardNumber && <option value="bank">Bank ({bankCardNumber})</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount Paid</label>
                      <input name="amount" type="number" defaultValue={packagePrice} readOnly className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white border border-white/10 opacity-70" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Transaction ID (TrxID)</label>
                    <input name="trxId" required className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white border border-white/10" placeholder="e.g. 9HR45..." />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Upload Screenshot</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-colors">
                        {isUploading ? <Loader2 className="animate-spin text-neon-blue" /> : <Upload className="text-neon-blue" />}
                        <span className="text-gray-300 font-medium">Click to upload image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                      {screenshotUrl && (
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0">
                          <img src={screenshotUrl} alt="Receipt" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                  <button disabled={isSubmitting} className="w-full py-4 rounded-xl bg-neon-blue text-white font-bold tracking-wide hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(0,243,255,0.5)]">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Payment Details"}
                  </button>
                </form>
              </motion.div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
