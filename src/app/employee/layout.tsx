"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Package, CreditCard, Router,
  FileText, Settings, Megaphone, LogOut, Menu, X,
  Headphones, Bell, Loader2, LifeBuoy,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";

const nav = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "Customers", href: "/employee/customers", icon: Users },
  { name: "Packages", href: "/employee/packages", icon: Package },
  { name: "Billing", href: "/employee/billing", icon: CreditCard },
  { name: "MikroTik", href: "/employee/mikrotik", icon: Router },
  { name: "Notice", href: "/employee/notices", icon: Megaphone },
  { name: "Support", href: "/employee/tickets", icon: LifeBuoy },
  { name: "Reports", href: "/employee/reports", icon: FileText },
  { name: "Settings", href: "/employee/settings", icon: Settings },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; link: string }[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    fetch("/api/employee/notifications").then(r => r.json()).then(data => {
      if (Array.isArray(data)) { setNotifications(data); if (data.length > 0) setHasUnread(true); }
    }).catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login/employee");
    router.refresh();
  }

  const pageTitle = nav.find(n => n.href === pathname || (n.href !== "/employee" && pathname.startsWith(n.href)))?.name || "Employee";

  return (
    <div className="min-h-screen flex text-slate-100 w-full" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b27 100%)" }}>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto",
        open ? "translate-x-0" : "-translate-x-full"
      )} style={{ width: 210, background: "#0d1117", borderColor: "rgba(255,255,255,0.06)" }}>

        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <div className="text-base font-extrabold tracking-tight flex items-center gap-1.5" style={{ color: "#fb923c" }}>
              <Headphones size={16} /> NexusBill
            </div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#c2410c" }}>◉ Employee Panel</div>
          </div>
          <button className="lg:hidden text-gray-500 hover:text-white" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        {/* Staff badge */}
        <div className="mx-3 my-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5" style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #c2410c, #fb923c)" }}>E</div>
          <div>
            <div className="text-[11px] font-semibold text-white">Employee</div>
            <div className="text-[9px] font-bold" style={{ color: "#fb923c" }}>Restricted Access</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto custom-scrollbar space-y-0.5">
          {nav.map(item => {
            const active = pathname === item.href || (item.href !== "/employee" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} onClick={() => setOpen(false)}
                className={clsx("flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group",
                  active ? "text-white" : "text-gray-400 hover:text-gray-200")}
                style={active ? { background: "rgba(251,146,60,0.1)", borderLeft: "2px solid #fb923c" } : {}}>
                <item.icon size={16} className={active ? "text-orange-400" : "text-gray-500 group-hover:text-gray-300"} />
                <span className="text-[12px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={handleLogout} disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-red-400 hover:text-red-300 disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.05)" }}>
            {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            <span className="text-[12px] font-semibold">{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center px-4 sm:px-5 shrink-0 sticky top-0 z-10"
          style={{ background: "#111827", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button className="lg:hidden p-1.5 mr-2 text-gray-400 hover:text-white rounded-md" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-sm font-bold text-gray-200 tracking-wide">{pageTitle}</h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold hidden sm:block" style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.25)" }}>Restricted Staff</span>
              <div className="relative z-50">
                <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) setHasUnread(false); }}
                  className="p-1.5 rounded-md text-gray-400 hover:text-white relative"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Bell size={16} />
                  {hasUnread && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                </button>
                <AnimatePresence>
                  {showNotif && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-1 w-72 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                      style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <h4 className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-white/5">Notifications</h4>
                      {notifications.length === 0 ? <p className="px-4 py-3 text-xs text-gray-500 text-center">No new notifications</p>
                        : notifications.map(n => <Link key={n.id} href={n.link} onClick={() => setShowNotif(false)} className="block px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 border-b border-white/5 last:border-b-0">{n.text}</Link>)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #c2410c, #fb923c)" }}>E</div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-5 overflow-y-auto custom-scrollbar">
          <motion.div initial={false} animate={{ opacity: 1 }}>{children}</motion.div>
        </main>
      </div>
    </div>
  );
}
