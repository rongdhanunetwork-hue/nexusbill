"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Package, CreditCard, Router,
  FileText, Settings, Megaphone, LogOut, ShieldAlert,
  Menu, X, Loader2, LifeBuoy, Bell, TrendingDown, UserCog,
  Layers, MessageSquare, History, TrendingUp, ChevronDown,
  ChevronRight, Search, Wifi, Box,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

type NavChild = { name: string; href: string };
type NavItem = {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    name: "Customers", icon: Users,
    children: [
      { name: "All Customers", href: "/admin/customers" },
      { name: "Add Customer", href: "/admin/customers/new" },
      { name: "Package Requests", href: "/admin/package-requests" },
    ],
  },
  { name: "User Management", href: "/admin/users", icon: UserCog },
  { name: "Packages", href: "/admin/packages", icon: Package },
  { name: "Billing", href: "/admin/billing", icon: CreditCard },
  { name: "SMS Templates", href: "/admin/sms-templates", icon: MessageSquare },
  { name: "SMS Logs", href: "/admin/sms-log", icon: History },
  { name: "Areas & Pole Boxes", href: "/admin/areas", icon: Layers },
  { name: "TJ Boxes / Splitters", href: "/admin/settings/tj-boxes", icon: Box },
  {
    name: "MikroTik", icon: Router,
    children: [
      { name: "Routers", href: "/admin/mikrotik" },
      { name: "PPPoE Users", href: "/admin/mikrotik/pppoe-users" },
      { name: "IP Pools", href: "/admin/ip-pools" },
    ],
  },
  { name: "Notice", href: "/admin/notices", icon: Megaphone },
  { name: "Support", href: "/admin/tickets", icon: LifeBuoy },
  {
    name: "Reports", icon: FileText,
    children: [
      { name: "All Reports", href: "/admin/reports" },
      { name: "Monthly Summary", href: "/admin/monthly-summary" },
      { name: "Audit Logs", href: "/admin/reports/audit-logs" },
    ],
  },
  { name: "Expenses", href: "/admin/expenses", icon: TrendingDown },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const [notifications, setNotifications] = useState<{ id: string; text: string; link: string }[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ name: string; photoUrl: string | null; role?: string | null; impersonatorId?: number | null } | null>(null);
  const [switchingBack, setSwitchingBack] = useState(false);

  async function handleSwitchBack() {
    setSwitchingBack(true);
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "back" }),
      });
      const data = await res.json();
      if (data.redirect) {
        router.push(data.redirect);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSwitchingBack(false);
    }
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: string; id: number; title: string; subtitle: string; url: string }[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Auto-open groups based on current path
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children) {
        const isGroupActive = item.children.some(c => pathname.startsWith(c.href));
        if (isGroupActive && !openGroups.includes(item.name)) {
          setOpenGroups(prev => [...prev, item.name]);
        }
      }
    });
  }, [pathname]);

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) { setNotifications(data); if (data.length > 0) setHasUnread(true); }
      }).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    fetch("/api/admin/profile").then(r => r.json()).then(data => {
      if (data?.name) setAdminProfile(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json()).then(data => { if (Array.isArray(data)) setSearchResults(data); setSearchLoading(false); })
        .catch(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login/admin");
    router.refresh();
  }

  function toggleGroup(name: string) {
    setOpenGroups(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]);
  }

  const pageTitle = (() => {
    for (const item of navigation) {
      if (item.href && (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)))) return item.name;
      if (item.children) {
        const child = item.children.find(c => pathname.startsWith(c.href));
        if (child) return child.name;
      }
    }
    return "Admin";
  })();

  return (
    <div className="min-h-screen flex text-slate-100 w-full" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b27 100%)" }}>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto print:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ width: 210, background: "#0d1117", borderColor: "rgba(255,255,255,0.06)" }}>

        {/* Brand */}
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <div className="text-base font-extrabold tracking-tight" style={{ color: "#00f3ff", letterSpacing: "-0.02em" }}>
              Rongdhunu DOT Net
            </div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#8b5cf6" }}>
              ◉ Admin Panel
            </div>
          </div>
          <button className="lg:hidden text-gray-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Admin profile chip */}
        <div className="mx-3 my-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}>
            {adminProfile?.name?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-white truncate">{adminProfile?.name || "Admin"}</div>
            <div className="text-[9px] font-bold" style={{ color: "#8b5cf6" }}>{adminProfile?.role === "superadmin" ? "Super Admin" : "Admin"}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto custom-scrollbar space-y-0.5">
          {navigation.map((item) => {
            const hasChildren = !!item.children;
            const isGroupOpen = openGroups.includes(item.name);
            const isItemActive = item.href
              ? (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)))
              : false;
            const isGroupActive = hasChildren && item.children!.some(c => pathname.startsWith(c.href));

            if (hasChildren) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 group",
                      isGroupActive ? "text-white" : "text-gray-400 hover:text-gray-200"
                    )}
                    style={isGroupActive ? { background: "rgba(6,182,212,0.08)" } : {}}
                  >
                    <item.icon size={16} className={isGroupActive ? "text-cyan-400" : "text-gray-500 group-hover:text-gray-300"} />
                    <span className="text-[12px] font-semibold flex-1">{item.name}</span>
                    {isGroupOpen ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                  </button>
                  <AnimatePresence>
                    {isGroupOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-6 border-l pl-2 mt-0.5 space-y-0.5 pb-1" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                          {item.children!.map(child => {
                            const isChildActive = pathname.startsWith(child.href);
                            return (
                              <Link key={child.href} href={child.href} onClick={() => setSidebarOpen(false)}
                                className={clsx(
                                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150",
                                  isChildActive ? "text-white" : "text-gray-500 hover:text-gray-200"
                                )}
                                style={isChildActive ? { background: "rgba(6,182,212,0.12)", color: "#06b6d4" } : {}}
                              >
                                {isChildActive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#06b6d4" }} />}
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
            }

            return (
              <Link key={item.name} href={item.href!} onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group relative overflow-hidden",
                  isItemActive ? "text-white" : "text-gray-400 hover:text-gray-200"
                )}
                style={isItemActive ? { background: "rgba(6,182,212,0.1)", borderLeft: "2px solid #06b6d4" } : {}}
              >
                <item.icon size={16} className={isItemActive ? "text-cyan-400" : "text-gray-500 group-hover:text-gray-300"} />
                <span className="text-[12px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={handleLogout} disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-red-400 hover:text-red-300 group disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.05)" }}
          >
            {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            <span className="text-[12px] font-semibold">{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 flex items-center px-4 sm:px-5 shrink-0 sticky top-0 z-10 print:hidden"
          style={{ background: "#111827", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button className="lg:hidden p-1.5 mr-2 text-gray-400 hover:text-white rounded-md" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex-1 flex items-center gap-4">
            <h1 className="text-sm font-bold text-white tracking-wide hidden md:block shrink-0 text-gray-200">{pageTitle}</h1>

            {/* Search */}
            <div className="relative flex-1 max-w-md z-50">
              <div className="relative flex items-center">
                {searchLoading ? <Loader2 size={14} className="absolute left-3 text-cyan-400 animate-spin" />
                  : <Search size={14} className="absolute left-3 text-gray-500" />}
                <input type="text" placeholder="Search customers, packages, routers..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs text-white rounded-lg focus:outline-none transition-all placeholder-gray-600"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                    className="absolute right-3 text-gray-500 hover:text-white text-xs">✕</button>
                )}
              </div>
              <AnimatePresence>
                {showSearchDropdown && searchQuery.trim() && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    className="absolute left-0 right-0 mt-1.5 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto py-1 z-50"
                    style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {searchResults.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-gray-500 text-center">No results for "{searchQuery}"</p>
                    ) : searchResults.map(res => (
                      <Link key={`${res.type}-${res.id}`} href={res.url}
                        onClick={() => { setShowSearchDropdown(false); setSearchQuery(""); }}
                        className="block px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-xs">{res.title}</span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}>{res.type}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{res.subtitle}</p>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {showSearchDropdown && searchQuery && <div className="fixed inset-0 z-40" onClick={() => setShowSearchDropdown(false)} />}

            {/* Right side */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {/* Bell */}
              <div className="relative z-50">
                <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) setHasUnread(false); }}
                  className="p-1.5 rounded-md text-gray-400 hover:text-white relative transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Bell size={16} />
                  {hasUnread && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                </button>
                <AnimatePresence>
                  {showNotif && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 w-72 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                      style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <h4 className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-white/5">Notifications</h4>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-gray-500 text-center">No new notifications</p>
                      ) : notifications.map(n => (
                        <Link key={n.id} href={n.link} onClick={() => setShowNotif(false)}
                          className="block px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors">
                          {n.text}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/admin/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-[11px] text-gray-400 hidden sm:block">{adminProfile?.name || "Admin"}</span>
                {adminProfile?.photoUrl ? (
                  <img src={adminProfile.photoUrl} alt="Admin" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}>
                    {adminProfile?.name?.charAt(0).toUpperCase() || "A"}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 custom-scrollbar">
          {adminProfile?.impersonatorId && (
            <div className="mb-4 p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-lg shadow-amber-500/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <ShieldAlert size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Impersonation Active</h4>
                  <p className="text-xs text-amber-200/80">You are viewing the portal as <strong>{adminProfile.name}</strong>. Actions performed will affect this admin's tenant.</p>
                </div>
              </div>
              <button
                onClick={handleSwitchBack}
                disabled={switchingBack}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 active:scale-95 transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
              >
                {switchingBack ? <Loader2 size={12} className="animate-spin" /> : null}
                Return to Super Admin
              </button>
            </div>
          )}
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
