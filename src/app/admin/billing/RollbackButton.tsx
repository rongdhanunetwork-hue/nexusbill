"use client";

import { RotateCcw } from "lucide-react";

interface Props {
  action: (formData: FormData) => void;
  paymentId: number;
  label?: string;
  className?: string;
}

export default function RollbackButton({ action, paymentId, label = "Rollback", className }: Props) {
  return (
    <form 
      action={action} 
      onSubmit={(e) => {
        if (!confirm(`Are you sure you want to rollback this payment? This will deduct the corresponding active days from the customer's account.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="paymentId" value={paymentId} />
      <button 
        type="submit" 
        className={className || "px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all flex items-center gap-1.5"}
      >
        <RotateCcw size={12} />
        {label}
      </button>
    </form>
  );
}
