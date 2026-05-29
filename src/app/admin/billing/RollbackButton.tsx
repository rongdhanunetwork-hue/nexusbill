"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle, X, RotateCcw } from "lucide-react";

interface RollbackButtonProps {
  paymentId: number;
  customerName: string | null;
  amount: string;
  rollbackAction: (formData: FormData) => Promise<void>;
}

export default function RollbackButton({
  paymentId,
  customerName,
  amount,
  rollbackAction,
}: RollbackButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    const fd = new FormData();
    fd.append("paymentId", String(paymentId));
    startTransition(async () => {
      await rollbackAction(fd);
      setShowConfirm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3500);
    });
  };

  return (
    <>
      {/* Rollback trigger button */}
      <button
        onClick={() => setShowConfirm(true)}
        className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all"
      >
        Rollback
      </button>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isPending && setShowConfirm(false)}
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900/95 shadow-2xl shadow-red-500/10 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Close */}
            {!isPending && (
              <button
                onClick={() => setShowConfirm(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            )}

            {/* Icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 mx-auto">
              <AlertTriangle size={28} className="text-red-400" />
            </div>

            {/* Content */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Rollback নিশ্চিত করুন?</h3>
              <p className="text-sm text-gray-400">
                <span className="text-white font-semibold">{customerName || "এই কাস্টমার"}</span> এর{" "}
                <span className="text-red-400 font-bold">৳{amount}</span> পেমেন্ট রোলব্যাক হবে।
              </p>
              <p className="text-xs text-gray-500 mt-1">
                কাস্টমারের মেয়াদ ও স্ট্যাটাস পূর্ববর্তী অবস্থায় ফিরে যাবে।
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                বাতিল
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    হচ্ছে...
                  </>
                ) : (
                  "হ্যাঁ, Rollback করুন"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900/95 border border-neon-green/40 shadow-2xl shadow-neon-green/10 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-neon-green/15 border border-neon-green/30">
            <CheckCircle size={18} className="text-neon-green" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Rollback সফল হয়েছে!</p>
            <p className="text-xs text-gray-400">
              {customerName} এর পেমেন্ট ৳{amount} রোলব্যাক করা হয়েছে।
            </p>
          </div>
        </div>
      )}
    </>
  );
}
