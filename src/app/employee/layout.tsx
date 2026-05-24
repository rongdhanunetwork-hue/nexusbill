"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Banknote,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  Headphones,
  ShieldAlert,
  Bell,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";

const nav = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "Customers", href: "/employee/customers", icon: Users },
  { name: "Bill Collection", href: "/employee/collection", icon: Banknote },
  { name: "Tickets", href: "/employee/tickets", icon: LifeBuoy },
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
    fetch("/api/employee/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
          if (data.length > 0) {
            setHasUnread(true);
          }
        }
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login/employee");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex text-slate-100">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 w-64 glass-panel transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col border-r border-white/10",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
          <span className="text-xl font-bold text-orange-350 flex gap-2 items-center">
            <Headphones size={22} className="text-orange-400" /> Employee
          </span>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="m-4 p-3 rounded-xl bg-orange-500/10 text-orange-200 border border-orange-400/20 text-xs flex gap-2">
          <ShieldAlert size={16} className="shrink-0" /> Company total income and core network settings are hidden.
        </div>

        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/employee" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  active
                    ? "bg-orange-500/20 text-white border border-orange-400/30 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]"
                    : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                )}
              >
                <item.icon
                  size={20}
                  className={clsx("transition-colors", active ? "text-orange-400" : "group-hover:text-orange-400")}
                />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-neon-red transition-all duration-200 border border-transparent hover:border-red-500/20 disabled:opacity-50"
          >
            {loggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
            <span className="font-medium">{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="glass-panel h-16 px-4 sm:px-6 lg:px-8 flex items-center sticky top-0 z-10">
          <button className="lg:hidden p-2 mr-2 text-gray-400 hover:bg-white/10 rounded-lg" onClick={() => setOpen(true)}>
            <Menu size={24} />
          </button>

          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-white">
              {nav.find((n) => n.href === pathname)?.name || "Employee"}
            </h1>
            <div className="flex items-center gap-4 relative">
              <span className="text-xs px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/30 hidden sm:block">
                Restricted Staff
              </span>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotif(!showNotif);
                    if (!showNotif) setHasUnread(false);
                  }}
                  className="p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 relative transition-colors"
                >
                  <Bell size={20} />
                  {hasUnread && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                  )}
                </button>
                <AnimatePresence>
                  {showNotif && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden py-2 z-50 text-left"
                    >
                      <h4 className="px-4 py-2 text-xs font-bold text-gray-400 uppercase border-b border-white/5 mb-1">
                        Notifications
                      </h4>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-500 text-center">No new notifications</p>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => setShowNotif(false)}
                            className="block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                          >
                            {n.text}
                          </Link>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/20 cursor-pointer hover:scale-105 transition-transform">
                E
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
          <motion.div initial={false} animate={{ opacity: 1 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
