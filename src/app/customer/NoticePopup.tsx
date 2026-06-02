"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone } from "lucide-react";

export default function NoticePopup() {
  const [notice, setNotice] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/admin/notices")
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const latestNotice = data[0];
          const dismissedId = localStorage.getItem("dismissedNoticeId");
          if (dismissedId !== String(latestNotice.id)) {
            setNotice(latestNotice);
            setShow(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    if (notice) {
      localStorage.setItem("dismissedNoticeId", String(notice.id));
      setShow(false);
    }
  };

  return (
    <AnimatePresence>
      {show && notice && (
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
            className="bg-slate-900 border border-neon-blue/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.15)] relative"
          >
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={handleDismiss}
                className="p-2 bg-black/50 hover:bg-black/80 rounded-full text-gray-300 hover:text-white backdrop-blur-md transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {notice.imageUrl ? (
              <div className="w-full h-48 sm:h-64 relative bg-black">
                <img 
                  src={notice.imageUrl} 
                  alt={notice.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              </div>
            ) : (
              <div className="bg-gradient-to-br from-neon-blue/20 to-purple-500/20 p-8 flex justify-center items-center">
                <Megaphone size={48} className="text-neon-blue animate-pulse" />
              </div>
            )}

            <div className="p-6 md:p-8 pt-4 md:pt-6 relative z-10 -mt-6">
              <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl mb-4 text-center inline-block">
                <h3 className="text-xl md:text-2xl font-bold text-white">{notice.title}</h3>
              </div>
              
              <div className="bg-white/5 rounded-xl p-5 border border-white/5 text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                {notice.message}
              </div>

              <button 
                onClick={handleDismiss}
                className="mt-6 w-full py-3.5 bg-neon-blue hover:bg-neon-blue/80 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]"
              >
                Got it, Thanks!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
