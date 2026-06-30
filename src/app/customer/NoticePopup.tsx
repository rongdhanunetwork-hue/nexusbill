"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone } from "lucide-react";

export default function NoticePopup() {
  const [notice, setNotice] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/customer/notices")
      .then(res => res.json())
      .then(data => {
        if (data && data.notices && data.notices.length > 0) {
          const latestNotice = data.notices[0];
          const cId = data.customerId;
          setCustomerId(cId);
          
          const dismissedId = localStorage.getItem(`dismissedNoticeId_${cId}`);
          if (dismissedId !== String(latestNotice.id)) {
            setNotice(latestNotice);
            setShow(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    if (notice && customerId) {
      localStorage.setItem(`dismissedNoticeId_${customerId}`, String(notice.id));
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
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="bg-[#1C2534] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/50 relative"
          >
            <div className="absolute top-3 right-3 z-10">
              <button 
                onClick={handleDismiss}
                className="p-1.5 bg-black/40 hover:bg-black/70 rounded-full text-white/80 hover:text-white backdrop-blur-sm transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {notice.imageUrl ? (
              <div className="w-full bg-black">
                <img 
                  src={notice.imageUrl} 
                  alt={notice.title} 
                  className="w-full max-h-[250px] object-cover"
                />
              </div>
            ) : (
              <div className="bg-[#243042] p-8 flex justify-center items-center border-b border-white/5">
                <Megaphone size={40} className="text-blue-400" />
              </div>
            )}

            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{notice.title}</h3>
              
              <div className="text-gray-300 leading-relaxed text-[15px] whitespace-pre-wrap mb-6">
                {notice.message}
              </div>

              <button 
                onClick={handleDismiss}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center"
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
