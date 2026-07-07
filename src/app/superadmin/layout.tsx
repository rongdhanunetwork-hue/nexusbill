"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UserCog, Settings, LogOut,
  Menu, X, Loader2, Bell, ShieldCheck, Database,
  BarChart3, Building2, ChevronDown, ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

type NavChild = { name: string; href: string };
type NavItem = { name: string; href?: string; icon: React.ElementType; children?: NavChild[] };

const nav: NavItem[] = [
  { name: "Dashboard", href: "/superadmin", icon: LayoutDashboard },
  {
    name: "Admins", icon: UserCog,
    children: [
      { name: "All Admins", href: "/superadmin/admins" },
      { name: "Add Admin", href: "/superadmin/admins/new" },
    ],
  },
  { name: "All Users", href: "/superadmin/users", icon: Users },
  { name: "System Stats", href: "/superadmin/stats", icon: BarChart3 },
  { name: "Notifications", href: "/superadmin/notifications", icon: Bell },
  { name: "Settings", href: "/superadmin/settings", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{ id: string | number; text: string; message: string; link: string; isRead: boolean }[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [profile, setProfile] = useState<{ name: string } | null>(null);

  useEffect(() => {
    nav.forEach(item => {
      if (item.children) {
        const active = item.children.some(c => pathname.startsWith(c.href));
        if (active) setOpenGroups(prev => prev.includes(item.name) ? prev : [...prev, item.name]);
      }
    });
  }, [pathname]);

  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) { 
          setNotifications(data); 
          if (data.some(n => !n.isRead)) setHasUnread(true); 
        }
      }).catch(() => {});
  }, [pathname]);

  const handleNotificationClick = async (id: string | number, link: string) => {
    setShowNotif(false);
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notifications.filter(n => n.id !== id && !n.isRead).length === 0) {
        setHasUnread(false);
      }
    } catch (err) {
      console.error("Error marking as read", err);
    }
  };

  useEffect(() => {
    fetch("/api/superadmin/profile").then(r => r.json()).then(data => {
      if (data?.name) setProfile(data);
    }).catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function toggleGroup(name: string) {
    setOpenGroups(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]);
  }

  const pageTitle = (() => {
    for (const item of nav) {
      if (item.href && (pathname === item.href || (item.href !== "/superadmin" && pathname.startsWith(item.href)))) return item.name;
      if (item.children) { const c = item.children.find(c => pathname.startsWith(c.href)); if (c) return c.name; }
    }
    return "Super Admin";
  })();

  return (
    <div className="min-h-screen flex text-slate-100 w-full" style={{ background: "linear-gradient(135deg, #0d1117 0%, #1a1208 100%)" }}>
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
      )} style={{ width: 210, background: "#0d1117", borderColor: "rgba(251,191,36,0.12)" }}>

        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(251,191,36,0.12)" }}>
          <div>
            <div className="text-base font-extrabold tracking-tight flex items-center gap-1.5" style={{ color: "#fbbf24" }}>
              <ShieldCheck size={16} /> Rongdhunu DOT Net
            </div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#d97706" }}>★ Super Admin Panel</div>
          </div>
          <button className="lg:hidden text-gray-500 hover:text-white" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        {/* Super Admin chip */}
        <div className="mx-3 my-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #92400e, #fbbf24)" }}>
            {profile?.name?.charAt(0).toUpperCase() || "S"}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-white truncate">{profile?.name || "Super Admin"}</div>
            <div className="text-[9px] font-bold flex items-center gap-1" style={{ color: "#fbbf24" }}>★ Full Control</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto custom-scrollbar space-y-0.5">
          {nav.map(item => {
            const hasChildren = !!item.children;
            const isGroupOpen = openGroups.includes(item.name);
            const isItemActive = item.href ? (pathname === item.href || (item.href !== "/superadmin" && pathname.startsWith(item.href))) : false;
            const isGroupActive = hasChildren && item.children!.some(c => pathname.startsWith(c.href));

            if (hasChildren) return (
              <div key={item.name}>
                <button onClick={() => toggleGroup(item.name)}
                  className={clsx("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 group",
                    isGroupActive ? "text-white" : "text-gray-400 hover:text-gray-200")}
                  style={isGroupActive ? { background: "rgba(251,191,36,0.08)" } : {}}>
                  <item.icon size={16} className={isGroupActive ? "text-yellow-400" : "text-gray-500 group-hover:text-gray-300"} />
                  <span className="text-[12px] font-semibold flex-1">{item.name}</span>
                  {isGroupOpen ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                </button>
                <AnimatePresence>
                  {isGroupOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                      <div className="ml-6 border-l pl-2 mt-0.5 space-y-0.5 pb-1" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                        {item.children!.map(child => {
                          const isChildActive = pathname.startsWith(child.href);
                          return (
                            <Link key={child.href} href={child.href} onClick={() => setOpen(false)}
                              className={clsx("flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                                isChildActive ? "text-yellow-300" : "text-gray-500 hover:text-gray-200")}
                              style={isChildActive ? { background: "rgba(251,191,36,0.1)" } : {}}>
                              {isChildActive && <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-yellow-400" />}
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );

            return (
              <Link key={item.name} href={item.href!} onClick={() => setOpen(false)}
                className={clsx("flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group",
                  isItemActive ? "text-white" : "text-gray-400 hover:text-gray-200")}
                style={isItemActive ? { background: "rgba(251,191,36,0.08)", borderLeft: "2px solid #fbbf24" } : {}}>
                <item.icon size={16} className={isItemActive ? "text-yellow-400" : "text-gray-500 group-hover:text-gray-300"} />
                <span className="text-[12px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "rgba(251,191,36,0.12)" }}>
          <button onClick={handleLogout} disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-red-400 hover:text-red-300 disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.05)" }}>
            {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            <span className="text-[12px] font-semibold">{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center px-4 sm:px-5 shrink-0 sticky top-0 z-10"
          style={{ background: "#111827", borderBottom: "1px solid rgba(251,191,36,0.1)" }}>
          <button className="lg:hidden p-1.5 mr-2 text-gray-400 hover:text-white rounded-md" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-sm font-bold text-gray-200 tracking-wide">{pageTitle}</h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold hidden sm:block"
                style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                ★ Super Admin
              </span>
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
                      className="absolute right-0 top-full mt-1 w-64 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                      style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <h4 className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-white/5">Notifications</h4>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-gray-500 text-center">No new notifications</p>
                      ) : notifications.map(n => (
                        <Link key={n.id} href={n.link} onClick={() => handleNotificationClick(n.id, n.link)}
                          className={`block px-4 py-2.5 text-xs hover:bg-white/5 border-b border-white/5 transition-colors ${n.isRead ? 'text-gray-400' : 'text-gray-200 font-medium bg-white/[0.02]'}`}>
                          <div className="font-semibold mb-0.5">{n.text}</div>
                          <div className="text-[10px] opacity-80 truncate">{n.message}</div>
                        </Link>
                      ))}
                      
                      <Link href="/superadmin/notifications" onClick={() => setShowNotif(false)} className="block px-4 py-2 text-center text-[10px] text-amber-400 font-semibold hover:bg-white/5">
                        View All Notifications
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #92400e, #fbbf24)" }}>
                {profile?.name?.charAt(0).toUpperCase() || "S"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
