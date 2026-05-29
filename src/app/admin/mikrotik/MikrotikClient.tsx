"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Router, RadioTower, Activity, Wifi, WifiOff, Plus, Power,
  RefreshCw, CheckCircle2, AlertTriangle, Loader2, Server, Trash, ShieldAlert,
  Edit, LogOut
} from "lucide-react";

interface PppoeSecret {
  ".id": string;
  name: string;
  password?: string;
  service: string;
  profile: string;
  disabled: string;
  comment?: string;
}

interface PppoeProfile {
  ".id": string;
  name: string;
  "local-address"?: string;
  "remote-address"?: string;
  "rate-limit"?: string;
  "only-one"?: string;
}

interface PppoeActive {
  ".id": string;
  name: string;
  address: string;
  uptime: string;
  "caller-id": string;
}

interface RouterStatus {
  ok: boolean;
  version?: string;
  error?: string;
}

interface MikrotikData {
  secrets: PppoeSecret[];
  active: PppoeActive[];
  profiles: PppoeProfile[];
  routerStatus: RouterStatus;
  error: string | null;
}

interface RouterDb {
  id: number;
  name: string;
  ipAddress: string;
  apiPort: number;
  status: boolean;
}

interface OltDb {
  id: number;
  name: string;
  ipAddress: string;
  portCount: number;
  connectionPort: number;
  status: boolean;
}

export default function MikrotikPageClient({ role = "admin" }: { role?: "admin" | "reseller" | "employee" }) {
  const [activeTab, setActiveTab] = useState<"live" | "routers" | "olts" | "profiles">("live");

  // Live tab states
  const [liveData, setLiveData] = useState<MikrotikData | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit secret state
  const [editingSecret, setEditingSecret] = useState<PppoeSecret | null>(null);
  const [editSecretForm, setEditSecretForm] = useState({ password: "", profile: "" });

  // OLT ONU Details modal states
  const [viewingOltOnus, setViewingOltOnus] = useState<OltDb | null>(null);
  const [onusData, setOnusData] = useState<any>(null);
  const [onusLoading, setOnusLoading] = useState(false);

  // Routers tab states
  const [routers, setRouters] = useState<RouterDb[]>([]);
  const [routersLoading, setRoutersLoading] = useState(false);
  const [addingRouter, setAddingRouter] = useState(false);

  // OLTs tab states
  const [olts, setOlts] = useState<OltDb[]>([]);
  const [oltsLoading, setOltsLoading] = useState(false);
  const [addingOlt, setAddingOlt] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // 1. Fetch functions
  const fetchLiveData = useCallback(async () => {
    setLiveLoading(true);
    try {
      const res = await fetch("/api/admin/mikrotik/pppoe");
      const d = await res.json();
      setLiveData(d);
    } catch {
      setLiveData({ secrets: [], active: [], profiles: [], routerStatus: { ok: false, error: "Failed to fetch" }, error: "Network error" });
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const fetchRouters = useCallback(async () => {
    setRoutersLoading(true);
    try {
      const res = await fetch("/api/admin/mikrotik/routers");
      const data = await res.json();
      if (Array.isArray(data)) setRouters(data);
    } catch {
      showToast("Failed to load routers list", false);
    } finally {
      setRoutersLoading(false);
    }
  }, []);

  const fetchOlts = useCallback(async () => {
    setOltsLoading(true);
    try {
      const res = await fetch("/api/admin/olts");
      const data = await res.json();
      if (Array.isArray(data)) setOlts(data);
    } catch {
      showToast("Failed to load OLTs list", false);
    } finally {
      setOltsLoading(false);
    }
  }, []);

  // Effect to load initial tab data
  useEffect(() => {
    if (activeTab === "live" || activeTab === "profiles") {
      fetchLiveData();
    } else if (activeTab === "routers") {
      fetchRouters();
    } else if (activeTab === "olts") {
      fetchOlts();
    }
  }, [activeTab, fetchLiveData, fetchRouters, fetchOlts]);

  // 2. Action functions
  async function toggleUser(secret: PppoeSecret) {
    const isDisabled = secret.disabled === "true";
    setActionLoading(secret[".id"]);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isDisabled ? "enable" : "disable",
          id: secret[".id"],
          name: secret.name,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message || "Done", true);
        fetchLiveData();
      } else {
        showToast(d.error || "Action failed", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRebootRouter() {
    if (!confirm("Are you sure you want to reboot the MikroTik router? This will temporarily disconnect all PPPoE sessions.")) return;
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reboot" }),
      });
      if (res.ok) {
        showToast("Reboot command sent. Router is restarting...", true);
        setTimeout(fetchLiveData, 15000);
      } else {
        showToast("Failed to reboot router", false);
      }
    } catch {
      showToast("Network error", false);
    }
  }

  async function handleDisconnectActive(id: string, name: string) {
    if (!confirm(`Are you sure you want to terminate active session for customer "${name}"? This will force them to reconnect.`)) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", id, name }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message || "Session disconnected", true);
        fetchLiveData();
      } else {
        showToast(d.error || "Action failed", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  function startEditSecret(secret: PppoeSecret) {
    setEditingSecret(secret);
    setEditSecretForm({
      password: secret.password || "",
      profile: secret.profile || "default"
    });
  }

  async function handleEditSecretSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSecret) return;
    setActionLoading(editingSecret[".id"]);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          id: editingSecret[".id"],
          name: editingSecret.name,
          password: editSecretForm.password,
          profile: editSecretForm.profile,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast("PPPoE user updated successfully!", true);
        setEditingSecret(null);
        fetchLiveData();
      } else {
        showToast(d.error || "Failed to update user", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteSecret(id: string, name: string) {
    if (!confirm(`Are you sure you want to permanently delete PPPoE user "${name}" from the router? This action cannot be undone.`)) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id, name }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message || "User deleted from router", true);
        fetchLiveData();
      } else {
        showToast(d.error || "Delete failed", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      action: "createProfile",
      name: String(form.get("name") || "").trim(),
      rateLimit: String(form.get("rateLimit") || "").trim(),
      localAddress: String(form.get("localAddress") || "").trim(),
      remoteAddress: String(form.get("remoteAddress") || "").trim(),
    };

    if (!body.name) {
      showToast("Profile Name is required", false);
      return;
    }

    setActionLoading("adding_profile");
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(`Speed Profile "${body.name}" created successfully!`, true);
        (e.target as HTMLFormElement).reset();
        fetchLiveData();
      } else {
        showToast(d.error || "Failed to create profile", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteProfile(id: string, name: string) {
    if (!confirm(`Are you sure you want to permanently delete speed profile "${name}"? PPPoE users using this profile might lose connectivity.`)) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteProfile", id }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast("Speed Profile deleted from router", true);
        fetchLiveData();
      } else {
        showToast(d.error || "Failed to delete profile", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddRouter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get("name") || "").trim(),
      ipAddress: String(form.get("ipAddress") || "").trim(),
      apiPort: Number(form.get("apiPort")) || 80,
      username: String(form.get("username") || "admin").trim(),
      password: String(form.get("password") || "").trim(),
    };

    if (!body.name || !body.ipAddress || !body.password) {
      showToast("Required fields: Name, IP Address, Password", false);
      return;
    }

    setAddingRouter(true);
    try {
      const res = await fetch("/api/admin/mikrotik/routers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast("Router registered successfully!", true);
        (e.target as HTMLFormElement).reset();
        fetchRouters();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to add router", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setAddingRouter(false);
    }
  }

  async function handleDeleteRouter(id: number) {
    if (!confirm("Are you sure you want to remove this router from system?")) return;
    try {
      const res = await fetch(`/api/admin/mikrotik/routers/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Router removed", true);
        fetchRouters();
      } else {
        showToast("Failed to delete router", false);
      }
    } catch {
      showToast("Network error", false);
    }
  }

  async function handleAddOlt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get("name") || "").trim(),
      ipAddress: String(form.get("ipAddress") || "").trim(),
      portCount: Number(form.get("portCount")) || 8,
      connectionPort: Number(form.get("connectionPort")) || 23,
    };

    if (!body.name || !body.ipAddress) {
      showToast("Required fields: Name, IP Address", false);
      return;
    }

    setAddingOlt(true);
    try {
      const res = await fetch("/api/admin/olts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast("OLT device added!", true);
        (e.target as HTMLFormElement).reset();
        fetchOlts();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to add OLT", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setAddingOlt(false);
    }
  }

  async function handleDeleteOlt(id: number) {
    if (!confirm("Are you sure you want to delete this OLT device?")) return;
    try {
      const res = await fetch(`/api/admin/olts/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("OLT device deleted", true);
        fetchOlts();
      } else {
        showToast("Failed to delete OLT", false);
      }
    } catch {
      showToast("Network error", false);
    }
  }

  async function handleViewOnuDetails(olt: OltDb) {
    setViewingOltOnus(olt);
    setOnusLoading(true);
    setOnusData(null);
    try {
      const res = await fetch(`/api/admin/olts/${olt.id}/onus`);
      const d = await res.json();
      if (res.ok) {
        setOnusData(d);
      } else {
        showToast(d.error || "Failed to fetch ONU details", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setOnusLoading(false);
    }
  }

  const activeNames = new Set((liveData?.active || []).map((a) => a.name));

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium border ${toast.ok
              ? "bg-neon-green/20 text-neon-green border-neon-green/30 shadow-neon-green/10"
              : "bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/10"
              }`}
          >
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide">
          {role === "reseller" ? "MikroTik Router Status" : "MikroTik Router & OLT Devices"}
        </h1>
        {role !== "reseller" && (
          <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab("live")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "live"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                : "text-gray-400 hover:text-white"
                }`}
            >
              Live Control
            </button>
            <button
              onClick={() => setActiveTab("profiles")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "profiles"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                : "text-gray-400 hover:text-white"
                }`}
            >
              Speed Profiles
            </button>
            <button
              onClick={() => setActiveTab("routers")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "routers"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                : "text-gray-400 hover:text-white"
                }`}
            >
              Routers List
            </button>
            <button
              onClick={() => setActiveTab("olts")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "olts"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                : "text-gray-400 hover:text-white"
                }`}
            >
              OLTs List
            </button>
          </div>
        )}
      </div>

      {/* Tab: Live Router Control */}
      {activeTab === "live" && (
        <div className="space-y-8">
          {/* Router Connection Status */}
          <div className={`glass-card p-4 flex items-center justify-between border ${liveData?.routerStatus.ok ? "border-neon-green/30" : "border-red-500/30"}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${liveData?.routerStatus.ok ? "bg-neon-green/20 text-neon-green" : "bg-red-500/20 text-red-400"}`}>
                <Server size={20} />
              </div>
              <div>
                <p className="text-white font-semibold">
                  MikroTik Router — bd2.mikrovpn.xyz:13065
                </p>
                <p className={`text-sm ${liveData?.routerStatus.ok ? "text-neon-green" : "text-red-400"}`}>
                  {liveData?.routerStatus.ok
                    ? `✓ Connected — RouterOS ${liveData.routerStatus.version}`
                    : `✗ Offline — ${liveData?.routerStatus.error || "Cannot connect"}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {liveData?.routerStatus.ok && role === "admin" && (
                <button
                  onClick={handleRebootRouter}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all text-sm font-semibold"
                >
                  <Power size={16} /> Reboot Router
                </button>
              )}
              <button
                onClick={fetchLiveData}
                disabled={liveLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10 transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw size={16} className={liveLoading ? "animate-spin" : ""} /> Refresh Live
              </button>
            </div>
          </div>

          {/* Quick Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "PPPoE Secrets", value: liveData?.secrets.length || 0, icon: <Router size={20} />, color: "text-neon-blue" },
              { label: "Online PPPoE Users", value: liveData?.active.length || 0, icon: <Activity size={20} />, color: "text-neon-green" },
              { label: "Accounts Enabled", value: liveData?.secrets.filter(s => s.disabled !== "true").length || 0, icon: <Wifi size={20} />, color: "text-teal-400" },
              { label: "Accounts Disabled", value: liveData?.secrets.filter(s => s.disabled === "true").length || 0, icon: <WifiOff size={20} />, color: "text-red-400" },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-4 flex items-center gap-3">
                <div className={`${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* PPPoE User Secrets Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-neon-green" />
                <h2 className="text-lg font-semibold text-white">Live Router Secrets (Users)</h2>
              </div>
              {liveLoading && <Loader2 size={18} className="animate-spin text-gray-400" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-400 uppercase bg-white/5">
                    <th className="p-4">PPPoE Username</th>
                    <th className="p-4">Profile</th>
                    <th className="p-4">Online Now</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {liveLoading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-500">
                        <Loader2 size={32} className="animate-spin mx-auto mb-2 text-neon-blue" />
                        Loading from router...
                      </td>
                    </tr>
                  ) : liveData?.error && liveData.secrets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-red-400">
                        <AlertTriangle size={32} className="mx-auto mb-2" />
                        Router offline: {liveData.error}
                      </td>
                    </tr>
                  ) : liveData?.secrets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">No PPPoE users on router.</td>
                    </tr>
                  ) : (
                    liveData?.secrets.map((secret) => {
                      const isOnline = activeNames.has(secret.name);
                      const isDisabled = secret.disabled === "true";
                      const isActioning = actionLoading === secret[".id"];
                      return (
                        <tr key={secret[".id"]} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white font-mono font-semibold">{secret.name}</td>
                          <td className="p-4 text-gray-300 text-sm">{secret.profile || "default"}</td>
                          <td className="p-4">
                            {isOnline ? (
                              <span className="flex items-center gap-1.5 text-neon-green text-sm">
                                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                                Online
                              </span>
                            ) : (
                              <span className="text-gray-500 text-sm">Offline</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${isDisabled ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-neon-green/20 text-neon-green border border-neon-green/30"}`}>
                              {isDisabled ? <><WifiOff size={10} /> Disabled</> : <><Wifi size={10} /> Enabled</>}
                            </span>
                          </td>
                          <td className="p-4">
                            {role === "admin" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleUser(secret)}
                                  disabled={isActioning}
                                  title={isDisabled ? "Enable" : "Disable"}
                                  className={`flex items-center justify-center p-2 rounded-lg border transition-colors disabled:opacity-50 ${isDisabled
                                    ? "bg-neon-green/20 text-neon-green border-neon-green/30 hover:bg-neon-green/30"
                                    : "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                                    }`}
                                >
                                  {isActioning ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Power size={14} />
                                  )}
                                </button>
                                <button
                                  onClick={() => startEditSecret(secret)}
                                  disabled={isActioning}
                                  title="Edit User"
                                  className="flex items-center justify-center p-2 rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30 transition-colors disabled:opacity-50"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSecret(secret[".id"], secret.name)}
                                  disabled={isActioning}
                                  title="Delete User from Router"
                                  className="flex items-center justify-center p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/35 transition-colors disabled:opacity-50"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-500 font-mono">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active online sessions table */}
          {liveData?.active && liveData.active.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <Wifi size={18} className="text-neon-green" />
                <h2 className="text-lg font-semibold text-white">Active Online Sessions (Router Live)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase bg-white/5">
                      <th className="p-4">Username</th>
                      <th className="p-4">IP Address</th>
                      <th className="p-4">Uptime</th>
                      <th className="p-4 text-gray-400">Caller ID (MAC)</th>
                      {role === "admin" && <th className="p-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {liveData.active.map((session) => (
                      <tr key={session[".id"]} className="hover:bg-white/5">
                        <td className="p-4 text-white font-mono">{session.name}</td>
                        <td className="p-4 text-neon-blue font-mono text-sm">{session.address}</td>
                        <td className="p-4 text-gray-300 text-sm">{session.uptime}</td>
                        <td className="p-4 text-gray-400 text-xs font-mono">{session["caller-id"]}</td>
                        {role === "admin" && (
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDisconnectActive(session[".id"], session.name)}
                              disabled={actionLoading === session[".id"]}
                              title="Disconnect Session (Force Reconnect)"
                              className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors disabled:opacity-50 inline-flex items-center gap-1 text-xs font-semibold"
                            >
                              {actionLoading === session[".id"] ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <LogOut size={12} />
                              )}
                              Kick
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create PPPoE user form */}
          {role === "admin" && (
            <AddPppoeForm onSuccess={fetchLiveData} onToast={showToast} profiles={liveData?.profiles || []} />
          )}
        </div>
      )}

      {/* Tab: Routers List */}
      {activeTab === "routers" && (
        <div className={role === "admin" ? "grid lg:grid-cols-3 gap-8" : "space-y-6"}>
          <div className={role === "admin" ? "lg:col-span-2 space-y-6" : "space-y-6"}>
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Registered Routers</h2>
                {routersLoading && <Loader2 size={18} className="animate-spin text-gray-400" />}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase bg-white/5">
                      <th className="p-4">Router Info</th>
                      <th className="p-4">IP Address</th>
                      <th className="p-4">API Port</th>
                      <th className="p-4">Status</th>
                      {role === "admin" && <th className="p-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {routersLoading && routers.length === 0 ? (
                      <tr>
                        <td colSpan={role === "admin" ? 5 : 4} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin mx-auto mb-2 text-neon-blue" /> Loading routers...</td>
                      </tr>
                    ) : routers.length === 0 ? (
                      <tr>
                        <td colSpan={role === "admin" ? 5 : 4} className="p-8 text-center text-gray-500">No routers registered yet.</td>
                      </tr>
                    ) : (
                      routers.map((router) => (
                        <tr key={router.id} className="hover:bg-white/5">
                          <td className="p-4 text-white font-bold">{router.name}</td>
                          <td className="p-4 text-gray-300 font-mono">{router.ipAddress}</td>
                          <td className="p-4 text-gray-300 font-mono">{router.apiPort}</td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${router.status ? "bg-neon-green/20 text-neon-green border border-neon-green/20" : "bg-red-500/20 text-red-400 border border-red-500/20"}`}>
                              {router.status ? "Active" : "Disabled"}
                            </span>
                          </td>
                          {role === "admin" && (
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteRouter(router.id)}
                                className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors"
                              >
                                <Trash size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {role === "admin" && (
            <div className="space-y-6">
              <form onSubmit={handleAddRouter} className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-3 flex items-center gap-2"><Plus size={18} className="text-neon-blue" /> Add Router</h3>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Router Name</label>
                  <input name="name" required placeholder="e.g. Core MikroTik" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">IP Address / Domain</label>
                  <input name="ipAddress" required placeholder="e.g. bd2.mikrovpn.xyz" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">API REST Port</label>
                  <input name="apiPort" type="number" defaultValue={13065} required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Username</label>
                  <input name="username" defaultValue="admin" required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Password</label>
                  <input name="password" type="password" required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <button
                  type="submit"
                  disabled={addingRouter}
                  className="w-full py-3 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neon-blue/30 transition-colors"
                >
                  {addingRouter ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save Router
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab: OLT Devices */}
      {activeTab === "olts" && (
        <div className={role === "admin" ? "grid lg:grid-cols-3 gap-8" : "space-y-6"}>
          <div className={role === "admin" ? "lg:col-span-2 space-y-6" : "space-y-6"}>
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Registered OLT Devices</h2>
                {oltsLoading && <Loader2 size={18} className="animate-spin text-gray-400" />}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase bg-white/5">
                      <th className="p-4">OLT Device Name</th>
                      <th className="p-4">IP Address:Port</th>
                      <th className="p-4">Ports</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {oltsLoading && olts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin mx-auto mb-2 text-neon-blue" /> Loading OLTs...</td>
                      </tr>
                    ) : olts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">No OLT devices added yet.</td>
                      </tr>
                    ) : (
                      olts.map((olt) => (
                        <tr key={olt.id} className="hover:bg-white/5">
                          <td className="p-4 text-white font-bold flex items-center gap-2"><RadioTower size={16} className="text-teal-400" />{olt.name}</td>
                          <td className="p-4 text-gray-300 font-mono">{olt.ipAddress}:{olt.connectionPort || 23}</td>
                          <td className="p-4 text-gray-300 font-semibold">{olt.portCount} Ports</td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${olt.status ? "bg-neon-green/20 text-neon-green border border-neon-green/20" : "bg-red-500/20 text-red-400 border border-red-500/20"}`}>
                              {olt.status ? "Online" : "Offline"}
                            </span>
                          </td>
                          <td className="p-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewOnuDetails(olt)}
                              className="px-2.5 py-1 bg-teal-500/25 text-teal-300 border border-teal-500/35 hover:bg-teal-500/35 rounded-lg text-xs font-bold transition-all"
                            >
                              ONU Details
                            </button>
                            {role === "admin" && (
                              <button
                                onClick={() => handleDeleteOlt(olt.id)}
                                className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors"
                              >
                                <Trash size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
 
          {role === "admin" && (
            <div className="space-y-6">
              <form onSubmit={handleAddOlt} className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-3 flex items-center gap-2"><Plus size={18} className="text-teal-400" /> Add OLT Device</h3>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">OLT Name</label>
                  <input name="name" required placeholder="e.g. EPON OLT 01" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">IP Address</label>
                  <input name="ipAddress" required placeholder="e.g. 192.168.10.25" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Connection Port (Telnet/API)</label>
                  <input name="connectionPort" type="number" defaultValue="23" required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">OLT Port Count</label>
                  <select name="portCount" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white">
                    <option value="4" className="bg-slate-800">4 Ports</option>
                    <option value="8" className="bg-slate-800">8 Ports</option>
                    <option value="16" className="bg-slate-800">16 Ports</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={addingOlt}
                  className="w-full py-3 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-500/30 transition-colors"
                >
                  {addingOlt ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save OLT Device
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab: Speed Profiles */}
      {activeTab === "profiles" && (
        <div className={role === "admin" ? "grid lg:grid-cols-3 gap-8" : "space-y-6"}>
          <div className={role === "admin" ? "lg:col-span-2 space-y-6" : "space-y-6"}>
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-neon-blue" />
                  <h2 className="text-lg font-semibold text-white">PPPoE Speed Profiles (Packages)</h2>
                </div>
                {liveLoading && <Loader2 size={18} className="animate-spin text-gray-400" />}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-gray-400 uppercase bg-white/5">
                      <th className="p-4">Profile Name</th>
                      <th className="p-4">Local IP Address</th>
                      <th className="p-4">Remote IP Address (Pool)</th>
                      <th className="p-4">Rate Limit (Speed)</th>
                      {role === "admin" && <th className="p-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {liveLoading && (!liveData || liveData.profiles.length === 0) ? (
                      <tr>
                        <td colSpan={role === "admin" ? 5 : 4} className="p-8 text-center text-gray-500">
                          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-neon-blue" /> Loading profiles...
                        </td>
                      </tr>
                    ) : !liveData || liveData.profiles.length === 0 ? (
                      <tr>
                        <td colSpan={role === "admin" ? 5 : 4} className="p-8 text-center text-gray-500">No profiles found on router.</td>
                      </tr>
                    ) : (
                      liveData.profiles.map((prof) => (
                        <tr key={prof[".id"]} className="hover:bg-white/5">
                          <td className="p-4 text-white font-bold">{prof.name}</td>
                          <td className="p-4 text-gray-300 font-mono text-sm">{prof["local-address"] || "—"}</td>
                          <td className="p-4 text-gray-300 font-mono text-sm">{prof["remote-address"] || "—"}</td>
                          <td className="p-4 text-neon-green font-semibold">{prof["rate-limit"] || "Unlimited"}</td>
                          {role === "admin" && (
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteProfile(prof[".id"], prof.name)}
                                disabled={actionLoading === prof[".id"]}
                                className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === prof[".id"] ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash size={14} />
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {role === "admin" && (
            <div className="space-y-6">
              <form onSubmit={handleAddProfile} className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-3 flex items-center gap-2">
                  <Plus size={18} className="text-neon-blue" /> Create Speed Profile
                </h3>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Profile Name</label>
                  <input name="name" required placeholder="e.g. 10Mbps_Package" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Local IP Address</label>
                  <input name="localAddress" placeholder="e.g. 10.0.0.1" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Remote Address / Pool</label>
                  <input name="remoteAddress" placeholder="e.g. pppoe-pool" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Rate Limit (Rx/Tx)</label>
                  <input name="rateLimit" placeholder="e.g. 5M/10M" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
                  <span className="text-[10px] text-gray-400 mt-1 block">Format: [upload]/[download] (e.g. 5M/10M, 10M/10M)</span>
                </div>
                <button
                  type="submit"
                  disabled={actionLoading === "adding_profile"}
                  className="w-full py-3 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neon-blue/30 transition-colors disabled:opacity-50"
                >
                  {actionLoading === "adding_profile" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Profile
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Edit Secret Modal */}
      {editingSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md glass-card p-6 space-y-4 border border-white/20"
          >
            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Edit size={18} className="text-neon-blue" /> Edit PPPoE User: {editingSecret.name}
            </h3>
            <form onSubmit={handleEditSecretSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Password</label>
                <input
                  type="text"
                  value={editSecretForm.password}
                  onChange={(e) => setEditSecretForm({ ...editSecretForm, password: e.target.value })}
                  placeholder="Enter new password"
                  required
                  className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Profile</label>
                <select
                  value={editSecretForm.profile}
                  onChange={(e) => setEditSecretForm({ ...editSecretForm, profile: e.target.value })}
                  className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white"
                >
                  <option value="default" className="bg-slate-800">default</option>
                  {(liveData?.profiles || []).map((p) => (
                    <option key={p[".id"]} value={p.name} className="bg-slate-800">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSecret(null)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-gray-300 border border-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === editingSecret[".id"]}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {actionLoading === editingSecret[".id"] ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* OLT ONU Details Modal */}
      {viewingOltOnus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl glass-card p-6 space-y-4 border border-white/20 my-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <RadioTower size={20} className="text-teal-400" />
                OLT Device ONU Details: {viewingOltOnus.name} ({viewingOltOnus.ipAddress}:{viewingOltOnus.connectionPort || 23})
              </h3>
              <button
                type="button"
                onClick={() => setViewingOltOnus(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 border border-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>

            {onusLoading ? (
              <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="animate-spin text-teal-400" />
                <p className="text-sm">Querying OLT ports for active ONUs & laser signals...</p>
              </div>
            ) : onusData ? (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total ONUs</span>
                    <p className="text-lg font-bold text-white mt-0.5">{onusData.onus?.length || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Online ONUs</span>
                    <p className="text-lg font-bold text-neon-green mt-0.5">
                      {onusData.onus?.filter((o: any) => o.status === "online").length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Offline ONUs</span>
                    <p className="text-lg font-bold text-red-400 mt-0.5">
                      {onusData.onus?.filter((o: any) => o.status === "offline").length || 0}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">OLT Ports</span>
                    <p className="text-lg font-bold text-teal-300 mt-0.5">{onusData.portCount || 8} Ports</p>
                  </div>
                </div>

                {/* Table container */}
                <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-slate-950/40">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900 border-b border-white/10">
                      <tr className="text-xs text-gray-400 uppercase">
                        <th className="p-3">Port</th>
                        <th className="p-3">MAC Address</th>
                        <th className="p-3">Assigned User</th>
                        <th className="p-3">Rx Optical Power</th>
                        <th className="p-3">Laser Temp</th>
                        <th className="p-3">Distance</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Uptime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                      {onusData.onus?.map((onu: any) => {
                        const isOffline = onu.status === "offline";
                        const powerNum = parseFloat(onu.rxPower);
                        
                        let rxColor = "text-neon-green bg-neon-green/10 border-neon-green/20";
                        if (isOffline) {
                          rxColor = "text-red-500 bg-red-500/10 border-red-500/20";
                        } else if (powerNum <= -27) {
                          rxColor = "text-red-400 bg-red-500/10 border-red-500/20";
                        } else if (powerNum <= -25) {
                          rxColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
                        }

                        return (
                          <tr key={onu.id} className="hover:bg-white/5">
                            <td className="p-3 font-semibold text-white">{onu.port}</td>
                            <td className="p-3 font-mono">{onu.macAddress}</td>
                            <td className="p-3">
                              <span className="font-semibold text-white block">{onu.customerName}</span>
                              <span className="text-[10px] text-gray-400">{onu.username}</span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${rxColor}`}>
                                {isOffline ? "LOS (Offline)" : `${onu.rxPower} dBm`}
                              </span>
                            </td>
                            <td className="p-3">{onu.temperature}</td>
                            <td className="p-3">{onu.distance}</td>
                            <td className="p-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                !isOffline 
                                  ? "bg-neon-green/20 text-neon-green border border-neon-green/20" 
                                  : "bg-red-500/20 text-red-400 border border-red-500/20"
                              }`}>
                                {!isOffline ? "Online" : "Offline"}
                              </span>
                            </td>
                            <td className="p-3 font-mono">{onu.uptime}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">Failed to load details.</div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AddPppoeForm({ onSuccess, onToast, profiles }: { onSuccess: () => void; onToast: (msg: string, ok: boolean) => void; profiles: PppoeProfile[] }) {
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const password = String(form.get("password") || "").trim();
    const profile = String(form.get("profile") || "default").trim();

    if (!name || !password) {
      onToast("Username and password required", false);
      return;
    }

    setAdding(true);
    const res = await fetch("/api/admin/mikrotik/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name, password, profile }),
    });
    const d = await res.json();
    setAdding(false);

    if (res.ok) {
      onToast(`PPPoE user "${name}" created on router!`, true);
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
      onSuccess();
    } else {
      onToast(d.error || "Failed to create user", false);
    }
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Plus size={18} className="text-neon-blue" /> Add PPPoE User to Router
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/30 text-sm hover:bg-neon-blue/30 transition-colors font-semibold"
        >
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">PPPoE Username</label>
            <input name="name" required placeholder="e.g. customer01" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPwd ? "text" : "password"}
                required
                placeholder="PPPoE password"
                className="w-full glass-input px-4 py-2.5 pr-10 bg-slate-800 text-white"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" tabIndex={-1}>
                {showPwd ? <WifiOff size={14} /> : <Wifi size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Profile</label>
            <select name="profile" defaultValue="default" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white">
              <option value="default" className="bg-slate-800">default</option>
              {profiles.map((p) => (
                <option key={p[".id"]} value={p.name} className="bg-slate-800">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30 transition-colors disabled:opacity-50 text-sm font-semibold"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {adding ? "Creating on Router..." : "Create PPPoE User"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
