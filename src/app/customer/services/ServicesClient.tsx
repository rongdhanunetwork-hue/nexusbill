"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Globe, ExternalLink } from "lucide-react";

type ServiceLink = {
  id: number;
  name: string;
  url: string;
  description: string | null;
};

type ServiceCategory = {
  id: number;
  name: string;
  icon: string;
  type: string;
  color: string;
  links: ServiceLink[];
};

export default function CustomerServicesClient() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/customer/services");
        if (res.ok) {
          setCategories(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-neon-blue" size={40} />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] glass-card rounded-3xl border border-white/5">
        <Globe size={64} className="text-gray-600 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">No Services Available</h2>
        <p className="text-gray-400">Your provider hasn't added any services yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Live Servers</h1>
        <p className="text-gray-400 mt-2">Explore live TV, FTP servers, and apps provided for you.</p>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -5 }}
            className="glass-card rounded-3xl overflow-hidden border transition-all duration-300 shadow-lg hover:shadow-2xl pb-6"
            style={{ borderColor: `${cat.color}30`, background: "rgba(15, 23, 42, 0.4)" }}
          >
            {/* Category Header */}
            <div className="p-6 pb-8 relative" style={{ background: `linear-gradient(180deg, ${cat.color}15 0%, transparent 100%)` }}>
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border backdrop-blur-md"
                  style={{ background: `linear-gradient(135deg, ${cat.color}22, ${cat.color}05)`, borderColor: `${cat.color}50` }}>
                  {cat.icon.replace("🔗", "").trim() || cat.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-wide">{cat.name}</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2" 
                        style={{ background: `${cat.color}20`, color: cat.color }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                    {cat.links.length} Link{cat.links.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Links List */}
            <div className="px-6 space-y-4 relative z-10">
              {cat.links.map((link) => {
                const formattedUrl = link.url.startsWith("http") ? link.url : `http://${link.url}`;
                return (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={link.id}
                    href={formattedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group border border-white/5 hover:border-white/20 cursor-pointer overflow-hidden relative"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${cat.color}, transparent)` }} />
                    <div className="min-w-0 pr-4 relative z-10">
                      <div className="text-white font-semibold text-[16px] truncate transition-colors duration-300" style={{ color: "white" }}>
                        {link.name}
                      </div>
                      {link.description ? (
                        <div className="text-gray-400 text-xs mt-1.5 truncate group-hover:text-gray-300 transition-colors">{link.description}</div>
                      ) : (
                        <div className="text-gray-500 text-[11px] mt-1 truncate group-hover:text-gray-400 transition-colors">{link.url}</div>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:shadow-lg relative z-10"
                      style={{ background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30` }}>
                      <ExternalLink size={16} className="group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
