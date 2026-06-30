"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  bkashNumber: string;
  bkashNumber2: string;
  bankCardNumber: string;
  packagePrice: string;
  packageName: string;
}

export default function PayBillClient({ bkashNumber, bkashNumber2, bankCardNumber, packagePrice, packageName }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
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
      setError("Transaction ID (min 5 chars) and amount required.");
      return;
    }
    
    if (parseFloat(amount) !== parseFloat(packagePrice)) {
      setError(`You must pay exactly ৳${packagePrice} for your package.`);
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
      if (!res.ok) {
        setError(data.error || "Submit failed. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = [
    { key: "bkash", label: "bKash Merchant 1", number: bkashNumber, color: "#E2136E", textColor: "#FF4C9C" }
  ];

  if (bkashNumber2) {
    paymentMethods.push({ key: "bkash2", label: "bKash Merchant 2", number: bkashNumber2, color: "#E2136E", textColor: "#FF4C9C" });
  }

  if (bankCardNumber) {
    paymentMethods.push({ key: "bank", label: "Bank Card Details", number: bankCardNumber, color: "#00F3FF", textColor: "#00F3FF" });
  }



  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold text-white mb-8">
        Pay Bill
      </motion.h1>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-neon-green/10 to-transparent" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, delay: 0.1 }}
              className="w-24 h-24 bg-neon-green/20 text-neon-green rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-[0_0_30px_rgba(57,255,20,0.3)]"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-4 relative z-10">Payment Successful!</h2>
            <p className="text-gray-400 mb-8 relative z-10">
              আপনার পেমেন্ট সফলভাবে রিসিভ করা হয়েছে এবং আপনার ইন্টারনেট লাইন অটোমেটিক চালু/রিচার্জ হয়ে গেছে!
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 relative z-10">
              <button
                onClick={() => setSubmitted(false)}
                className="glass-button w-full sm:w-auto px-6 py-3 font-medium text-white"
              >
                Submit Another Payment
              </button>
              <a
                href="/customer/history"
                className="bg-gradient-to-r from-neon-blue to-teal-400 text-slate-900 w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-center hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:scale-105 active:scale-95 transition-all"
              >
                View History (হিস্ট্রি দেখুন)
              </a>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Payment Instructions */}
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/10 bg-white/5">
                <h2 className="text-lg font-semibold text-white">Payment Instructions</h2>
                <p className="text-sm text-gray-400 mt-2">নিচের নম্বরে Send Money করে অথবা সরাসরি অনলাইন লিংকের মাধ্যমে বিল পে করে Transaction ID ও Amount সাবমিট করুন।</p>
              </div>

              {/* Online bKash Payment Link Banner */}
              <div className="mx-6 mt-6 p-5 rounded-2xl bg-gradient-to-r from-[#E2136E]/25 via-[#E2136E]/5 to-transparent border border-[#E2136E]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 relative z-10">
                  <h3 className="text-[#FF4C9C] font-bold text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E2136E] animate-ping" />
                    bKash Online Pay (বিকাশ অনলাইন পেমেন্ট)
                  </h3>
                  <p className="text-xs text-gray-300">
                    সেন্ড মানি করার প্রয়োজন নেই; সরাসরি বিকাশ অনলাইন পেমেন্ট লিংকের মাধ্যমে বিল পে করতে ডানপাশের বাটনে ক্লিক করুন এবং ট্রানজাকশন আইডি নিচে সাবমিট করুন।
                  </p>
                </div>
                <a
                  href="https://shop.bkash.com/rdn-internet-service-provider0/paymentlink/default-payment"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#E2136E] hover:bg-[#b00f55] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-[#E2136E]/30 hover:scale-105 active:scale-95 transition-all shrink-0 z-10 text-center w-full md:w-auto"
                >
                  অনলাইন পেমেন্ট করুন
                </a>
              </div>

              <div className="p-6 grid sm:grid-cols-3 gap-4">
                {paymentMethods.map((m) => (
                  <div
                    key={m.key}
                    className="rounded-xl p-5 border"
                    style={{
                      background: `linear-gradient(135deg, ${m.color}20, ${m.color}08)`,
                      borderColor: `${m.color}40`,
                    }}
                  >
                    <div className="font-bold mb-2 text-base" style={{ color: m.textColor }}>
                      {m.label}
                    </div>
                    <div className="text-xl text-white font-mono tracking-wider">{m.number}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="glass-card p-6 md:p-8 space-y-6"
              animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                  <select
                    name="method"
                    required
                    className="w-full px-4 py-3 glass-input appearance-none bg-slate-800 text-white"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m.key} value={m.key} className="bg-slate-800">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (৳) <span className="text-neon-green text-xs font-bold bg-neon-green/10 px-2 py-0.5 rounded ml-2">{packageName}</span>
                  </label>
                  <input
                    name="amount"
                    type="number"
                    required
                    readOnly
                    value={packagePrice}
                    className="w-full px-4 py-3 glass-input bg-slate-800/80 text-gray-300 cursor-not-allowed"
                    title={`You must pay exactly ৳${packagePrice} for your package.`}
                  />
                  <p className="text-[10px] text-amber-400 mt-1">*Amount is fixed according to your active package.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Transaction ID</label>
                <input
                  type="text"
                  name="trxId"
                  required
                  placeholder="e.g. TXN123456789"
                  className={`w-full px-4 py-3 glass-input uppercase ${error ? "border-red-500 ring-1 ring-red-500/30" : ""}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Screenshot (Optional)</label>
                <input type="hidden" name="screenshotUrl" value={screenshotUrl} />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed ${screenshotUrl ? 'border-neon-green/50 bg-neon-green/5' : 'border-white/20 hover:border-white/30'} rounded-xl p-6 text-center transition-colors cursor-pointer relative overflow-hidden`}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center space-y-2 py-4">
                      <Loader2 className="animate-spin text-neon-blue" size={28} />
                      <p className="text-sm text-gray-400">Uploading...</p>
                    </div>
                  ) : screenshotUrl ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="text-neon-green" size={28} />
                      <p className="text-sm text-neon-green font-medium">Screenshot Uploaded Successfully!</p>
                      <img src={screenshotUrl} alt="Preview" className="h-16 rounded mt-2 object-cover border border-white/10" />
                      <p className="text-xs text-gray-400 mt-2">Click again to change</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 py-4">
                      <Upload className="text-gray-400" size={28} />
                      <p className="text-sm text-gray-300 font-medium">Tap or click to upload screenshot</p>
                      <p className="text-xs text-gray-500">Supports JPG, PNG, WEBP</p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-neon-blue to-teal-400 text-slate-900 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_25px_rgba(0,243,255,0.4)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit Payment"
                )}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
