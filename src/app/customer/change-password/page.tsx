"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function ChangePasswordPage() {
  return (
    <div className="max-w-md mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white tracking-wide">Change Password</h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 space-y-6"
      >
        <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mb-2">
          <AlertCircle size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-2">Feature Disabled / বন্ধ করা হয়েছে</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Password change option has been disabled by the administrator. Please contact customer support if you need to update your password.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
