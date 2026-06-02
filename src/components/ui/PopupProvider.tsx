"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, HelpCircle, X } from "lucide-react";

type PopupOptions = {
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
};

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type PopupContextType = {
  showAlert: (options: PopupOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
};

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [alertConfig, setAlertConfig] = useState<(PopupOptions & { resolve: () => void }) | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const showAlert = (options: PopupOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertConfig({ ...options, resolve });
    });
  };

  const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmConfig({ ...options, resolve });
    });
  };

  const closeAlert = () => {
    if (alertConfig) {
      alertConfig.resolve();
      setAlertConfig(null);
    }
  };

  const resolveConfirm = (value: boolean) => {
    if (confirmConfig) {
      confirmConfig.resolve(value);
      setConfirmConfig(null);
    }
  };

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      <AnimatePresence>
        {/* Alert Modal */}
        {alertConfig && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900/90 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            >
              <div className="p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 bg-white/5">
                  {alertConfig.type === 'error' ? <AlertCircle size={32} className="text-red-500" /> :
                   alertConfig.type === 'warning' ? <AlertCircle size={32} className="text-amber-500" /> :
                   <CheckCircle2 size={32} className="text-neon-green" />}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{alertConfig.title}</h3>
                <p className="text-gray-400 text-sm mb-6">{alertConfig.message}</p>
                <button 
                  onClick={closeAlert}
                  className="w-full py-3 rounded-xl font-bold transition-all bg-white/10 hover:bg-white/20 text-white"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Confirm Modal */}
        {confirmConfig && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900/90 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            >
              <div className="absolute top-3 right-3">
                <button onClick={() => resolveConfirm(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 text-center pt-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 bg-white/5">
                  <HelpCircle size={32} className={confirmConfig.danger ? "text-red-500" : "text-neon-blue"} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{confirmConfig.title}</h3>
                <p className="text-gray-400 text-sm mb-8">{confirmConfig.message}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => resolveConfirm(false)}
                    className="flex-1 py-3 rounded-xl font-bold transition-all bg-white/5 hover:bg-white/10 text-gray-300"
                  >
                    {confirmConfig.cancelText || "Cancel"}
                  </button>
                  <button 
                    onClick={() => resolveConfirm(true)}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-lg ${
                      confirmConfig.danger 
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30" 
                        : "bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 border border-neon-blue/30"
                    }`}
                  >
                    {confirmConfig.confirmText || "Yes, Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PopupContext.Provider>
  );
}

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (context === undefined) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return context;
};
