"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Router, RadioTower, Activity, Wifi, WifiOff, Plus, Power,
  RefreshCw, CheckCircle2, AlertTriangle, Loader2, Server, Trash, ShieldAlert
} from "lucide-react";

interface PppoeSecret {
  ".id": string;
  name: string;
  password: string;
  service: string;
  profile: string;
  disabled: string;
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
  status: boolean;
}

export default function MikrotikPageClient() {
  const [activeTab, setActiveTab] = useState<"live" | "routers" | "olts">("live");
  
  // Live tab states
  const [liveData, setLiveData] = useState<MikrotikData | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
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
      setLiveData({ secrets: [], active: [], routerStatus: { ok: false, error: "Failed to fetch" }, error: "Network error" });
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
    if (activeTab === "live") {
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
        <h1 className="text-2xl font-bold text-white tracking-wide">MikroTik Router & OLT Devices</h1>
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "live"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Live Control
          </button>
          <button
            onClick={() => setActiveTab("routers")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "routers"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Routers List
          </button>
          <button
            onClick={() => setActiveTab("olts")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "olts"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            OLTs List
          </button>
        </div>
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
            <button
              onClick={fetchLiveData}
              disabled={liveLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10 transition-colors text-sm disabled:opacity-50 animate-pulse"
            >
              <RefreshCw size={16} className={liveLoading ? "animate-spin" : ""} /> Refresh Live
            </button>
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
                            <button
                              onClick={() => toggleUser(secret)}
                              disabled={isActioning}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-50 ${isDisabled
                                ? "bg-neon-green/20 text-neon-green border-neon-green/30 hover:bg-neon-green/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                                }`}
                            >
                              {isActioning ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Power size={14} />
                              )}
                              {isDisabled ? "Enable" : "Disable"}
                            </button>
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
                      <th className="p-4">Caller ID (MAC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {liveData.active.map((session) => (
                      <tr key={session[".id"]} className="hover:bg-white/5">
                        <td className="p-4 text-white font-mono">{session.name}</td>
                        <td className="p-4 text-neon-blue font-mono text-sm">{session.address}</td>
                        <td className="p-4 text-gray-300 text-sm">{session.uptime}</td>
                        <td className="p-4 text-gray-400 text-xs font-mono">{session["caller-id"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create PPPoE user form */}
          <AddPppoeForm onSuccess={fetchLiveData} onToast={showToast} />
        </div>
      )}

      {/* Tab: Routers List */}
      {activeTab === "routers" && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {routersLoading && routers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin mx-auto mb-2 text-neon-blue" /> Loading routers...</td>
                      </tr>
                    ) : routers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">No routers registered yet.</td>
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
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteRouter(router.id)}
                              className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors"
                            >
                              <Trash size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

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
        </div>
      )}

      {/* Tab: OLT Devices */}
      {activeTab === "olts" && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
                      <th className="p-4">IP Address</th>
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
                          <td className="p-4 text-gray-300 font-mono">{olt.ipAddress}</td>
                          <td className="p-4 text-gray-300 font-semibold">{olt.portCount} Ports</td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${olt.status ? "bg-neon-green/20 text-neon-green border border-neon-green/20" : "bg-red-500/20 text-red-400 border border-red-500/20"}`}>
                              {olt.status ? "Online" : "Offline"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteOlt(olt.id)}
                              className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors"
                            >
                              <Trash size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

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
        </div>
      )}
    </div>
  );
}

function AddPppoeForm({ onSuccess, onToast }: { onSuccess: () => void; onToast: (msg: string, ok: boolean) => void }) {
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
            <input name="profile" placeholder="default" defaultValue="default" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white" />
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
