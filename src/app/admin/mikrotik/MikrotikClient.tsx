"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Router, RadioTower, Activity, Wifi, WifiOff, Plus, Power,
  RefreshCw, CheckCircle2, AlertTriangle, Loader2, Server, Trash, ShieldAlert,
  Edit, LogOut, X, FileText, DatabaseBackup
} from "lucide-react";
import { usePopup } from "@/components/ui/PopupProvider";

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

const PREDEFINED_BRANDS = [
  "BDCOM EPON",
  "BDCOM GPON",
  "VSOL EPON",
  "VSOL GPON",
  "Huawei GPON",
  "ZTE GPON",
  "Ecom EPON",
  "Ecom GPON"
];

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
  username?: string;
  password?: string;
}

interface OltDb {
  id: number;
  name: string;
  ipAddress: string;
  portCount: number;
  connectionPort: number;
  status: boolean;
  webPort?: number | null;
  protocol?: string | null;
  brand?: string | null;
  username?: string | null;
  password?: string | null;
  snmpCommunity?: string | null;
  timeout?: number | null;
}

export default function MikrotikPageClient({ role = "admin", initialTab = "live" }: { role?: "admin" | "reseller" | "employee"; initialTab?: "live" | "routers" | "olts" | "profiles" }) {
  const [activeTab, setActiveTab] = useState<"live" | "routers" | "olts" | "profiles">(initialTab);

  // Router selection state
  const [selectedRouterId, setSelectedRouterId] = useState<number | null>(null);
  const { showConfirm, showAlert } = usePopup();

  // Live tab states
  const [liveData, setLiveData] = useState<MikrotikData | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pagination states for Live Tab tables
  const [secretsPage, setSecretsPage] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const secretsPageSize = 10;
  const activePageSize = 10;

  // Reset page numbers when router changes
  useEffect(() => {
    setSecretsPage(1);
    setActivePage(1);
  }, [selectedRouterId]);

  // Edit secret state
  const [editingSecret, setEditingSecret] = useState<PppoeSecret | null>(null);
  const [editSecretForm, setEditSecretForm] = useState({ password: "", profile: "" });

  // OLT ONU Details modal states
  const [viewingOltOnus, setViewingOltOnus] = useState<OltDb | null>(null);
  const [onusData, setOnusData] = useState<any>(null);
  const [onusLoading, setOnusLoading] = useState(false);

  const [routers, setRouters] = useState<RouterDb[]>([]);
  const [routersLoading, setRoutersLoading] = useState(false);
  const [addingRouter, setAddingRouter] = useState(false);
  const [editingRouter, setEditingRouter] = useState<RouterDb | null>(null);
  const [testingRouterId, setTestingRouterId] = useState<number | null>(null);
  const [restoringRouterId, setRestoringRouterId] = useState<number | null>(null);
  const [showAddRouterModal, setShowAddRouterModal] = useState(false);

  // OLTs tab states
  const [olts, setOlts] = useState<OltDb[]>([]);
  const [oltsLoading, setOltsLoading] = useState(false);
  const [addingOlt, setAddingOlt] = useState(false);
  const [showAddOltModal, setShowAddOltModal] = useState(false);
  const [editingOlt, setEditingOlt] = useState<OltDb | null>(null);
  const [testingOltId, setTestingOltId] = useState<number | null>(null);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [registerBrand, setRegisterBrand] = useState("BDCOM EPON");
  const [editBrand, setEditBrand] = useState("");

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // 1. Fetch functions
  const fetchLiveData = useCallback(async () => {
    setLiveLoading(true);
    try {
      const url = selectedRouterId 
        ? `/api/admin/mikrotik/pppoe?routerId=${selectedRouterId}`
        : "/api/admin/mikrotik/pppoe";
      const res = await fetch(url);
      const d = await res.json();
      setLiveData(d);
    } catch {
      setLiveData({ secrets: [], active: [], profiles: [], routerStatus: { ok: false, error: "Failed to fetch" }, error: "Network error" });
    } finally {
      setLiveLoading(false);
    }
  }, [selectedRouterId]);

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

  // Fetch routers list on mount to populate the selector dropdown
  useEffect(() => {
    fetchRouters();
  }, [fetchRouters]);

  // Set default selected router when routers list is loaded
  useEffect(() => {
    if (routers.length > 0 && selectedRouterId === null) {
      setSelectedRouterId(routers[0].id);
    }
  }, [routers, selectedRouterId]);

  // Effect to load initial tab data and respond to active router change
  useEffect(() => {
    if (activeTab === "live" || activeTab === "profiles") {
      fetchLiveData();
    } else if (activeTab === "routers") {
      fetchRouters();
    } else if (activeTab === "olts") {
      fetchOlts();
    }
  }, [activeTab, selectedRouterId, fetchLiveData, fetchRouters, fetchOlts]);

  useEffect(() => {
    if (editingOlt) {
      setEditBrand(editingOlt.brand || "BDCOM EPON");
    } else {
      setEditBrand("");
    }
  }, [editingOlt]);

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
          routerId: selectedRouterId,
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
    const isConfirm = await showConfirm({
      title: "Reboot Router",
      message: "Are you sure you want to reboot the MikroTik router? This will temporarily disconnect all PPPoE sessions.",
      danger: true,
      confirmText: "Reboot"
    });
    if (!isConfirm) return;
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reboot", routerId: selectedRouterId }),
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
    const isConfirm = await showConfirm({
      title: "Terminate Session",
      message: `Are you sure you want to terminate active session for customer "${name}"? This will force them to reconnect.`,
      danger: true,
      confirmText: "Terminate"
    });
    if (!isConfirm) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", id, name, routerId: selectedRouterId }),
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
          routerId: selectedRouterId,
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
    const isConfirm = await showConfirm({
      title: "Delete User",
      message: `Are you sure you want to permanently delete PPPoE user "${name}" from the router? This action cannot be undone.`,
      danger: true,
      confirmText: "Delete"
    });
    if (!isConfirm) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id, name, routerId: selectedRouterId }),
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
      routerId: selectedRouterId,
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
    const isConfirm = await showConfirm({
      title: "Delete Speed Profile",
      message: `Are you sure you want to permanently delete speed profile "${name}"? PPPoE users using this profile might lose connectivity.`,
      danger: true,
      confirmText: "Delete"
    });
    if (!isConfirm) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteProfile", id, routerId: selectedRouterId }),
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
        const newRouter = await res.json();
        showToast("Router registered successfully!", true);
        (e.target as HTMLFormElement).reset();
        await fetchRouters();
        setShowAddRouterModal(false);
        if (newRouter && newRouter.id) {
          setSelectedRouterId(newRouter.id);
          setActiveTab("live");
        }
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
    const isConfirm = await showConfirm({
      title: "Remove Router",
      message: "Are you sure you want to remove this router from system?",
      danger: true,
      confirmText: "Remove"
    });
    if (!isConfirm) return;
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

  async function handleRestoreUsers(id: number) {
    const isConfirm = await showConfirm({
      title: "Restore Missing Users",
      message: "Are you sure you want to recreate all missing database users on this router?",
      confirmText: "Restore",
    });
    if (!isConfirm) return;

    showToast("Restoring users, please wait...", true);
    setRestoringRouterId(id);

    try {
      const res = await fetch(`/api/admin/mikrotik/routers/${id}/restore`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message || "Users restored successfully!", true);
        if (d.restoredCount > 0) {
          fetchRouters();
          if (activeTab === "live" && selectedRouterId === id) fetchLiveData();
        }
      } else {
        showToast(d.error || "Failed to restore users", false);
      }
    } catch {
      showToast("Network error while restoring", false);
    } finally {
      setRestoringRouterId(null);
    }
  }

  async function handleToggleRouter(id: number, currentStatus: boolean) {
    const actionStr = currentStatus ? 'deactivate' : 'activate';
    const isConfirm = await showConfirm({
      title: "Toggle Router",
      message: `Are you sure you want to ${actionStr} this router?`,
      confirmText: "Yes"
    });
    if (!isConfirm) return;
    try {
      const res = await fetch(`/api/admin/mikrotik/routers/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !currentStatus })
      });
      if (res.ok) {
        showToast(`Router ${currentStatus ? 'deactivated' : 'activated'}`, true);
        fetchRouters();
      } else {
        showToast("Failed to toggle router status", false);
      }
    } catch {
      showToast("Network error", false);
    }
  }

  async function handleTestRouter(id: number) {
    setTestingRouterId(id);
    try {
      const res = await fetch(`/api/admin/mikrotik/routers/${id}`, {
        method: "POST",
      });
      const d = await res.json();
      if (res.ok && d.success) {
        if (d.ok) {
          showToast(`Connected successfully! RouterOS Version: ${d.version}`, true);
        } else {
          showToast(`Connection failed: ${d.error}`, false);
        }
      } else {
        showToast(d.error || "Failed to run connection test", false);
      }
    } catch {
      showToast("Network error during connection test", false);
    } finally {
      setTestingRouterId(null);
    }
  }

  async function handleEditRouter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingRouter) return;
    const form = new FormData(e.currentTarget);
    const body: Record<string, any> = {
      name: String(form.get("name") || "").trim(),
      ipAddress: String(form.get("ipAddress") || "").trim(),
      apiPort: Number(form.get("apiPort")) || 80,
      username: String(form.get("username") || "admin").trim(),
    };
    const password = String(form.get("password") || "").trim();
    if (password) {
      body.password = password;
    }

    if (!body.name || !body.ipAddress) {
      showToast("Required fields: Name, IP Address", false);
      return;
    }

    setAddingRouter(true);
    try {
      const res = await fetch(`/api/admin/mikrotik/routers/${editingRouter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast("Router updated successfully!", true);
        setEditingRouter(null);
        fetchRouters();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update router", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setAddingRouter(false);
    }
  }


  async function handleAddOlt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const brandSelect = String(form.get("brandSelect") || "");
    const brandCustom = String(form.get("brandCustom") || "").trim();
    const brand = brandSelect === "CUSTOM" ? brandCustom : brandSelect;

    const body = {
      name: String(form.get("name") || "").trim(),
      ipAddress: String(form.get("ipAddress") || "").trim(),
      portCount: Number(form.get("portCount")) || 8,
      connectionPort: Number(form.get("connectionPort")) || 23,
      username: String(form.get("username") || "").trim(),
      password: String(form.get("password") || "").trim(),
      webPort: Number(form.get("webPort")) || 80,
      protocol: String(form.get("protocol") || "HTTP"),
      brand: brand || "BDCOM EPON",
      snmpCommunity: String(form.get("snmpCommunity") || "public").trim(),
      timeout: Number(form.get("timeout")) || 10,
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
        setShowAddOltModal(false);
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

  async function handleEditOlt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingOlt) return;
    const form = new FormData(e.currentTarget);
    const brandSelect = String(form.get("brandSelect") || "");
    const brandCustom = String(form.get("brandCustom") || "").trim();
    const brand = brandSelect === "CUSTOM" ? brandCustom : brandSelect;

    const body = {
      name: String(form.get("name") || "").trim(),
      ipAddress: String(form.get("ipAddress") || "").trim(),
      portCount: Number(form.get("portCount")) || 8,
      connectionPort: Number(form.get("connectionPort")) || 23,
      username: String(form.get("username") || "").trim(),
      password: String(form.get("password") || "").trim(),
      webPort: Number(form.get("webPort")) || 80,
      protocol: String(form.get("protocol") || "HTTP"),
      brand: brand || "BDCOM EPON",
      snmpCommunity: String(form.get("snmpCommunity") || "public").trim(),
      timeout: Number(form.get("timeout")) || 10,
    };

    if (!body.name || !body.ipAddress) {
      showToast("Required fields: Name, IP Address", false);
      return;
    }

    setAddingOlt(true);
    try {
      const res = await fetch(`/api/admin/olts/${editingOlt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast("OLT device updated successfully!", true);
        setEditingOlt(null);
        fetchOlts();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update OLT", false);
      }
    } catch {
      showToast("Network error", false);
    } finally {
      setAddingOlt(false);
    }
  }

  async function handleTestOlt(id: number) {
    setTestingOltId(id);
    try {
      const res = await fetch(`/api/admin/olts/${id}`, {
        method: "POST",
      });
      const d = await res.json();
      if (res.ok && d.success) {
        showToast(d.message || "Test completed successfully!", d.ok);
        fetchOlts();
      } else {
        showToast(d.error || "Failed to run connection test", false);
      }
    } catch {
      showToast("Network error during test connection", false);
    } finally {
      setTestingOltId(null);
    }
  }

  async function handleDeleteOlt(id: number) {
    const isConfirm = await showConfirm({
      title: "Delete OLT",
      message: "Are you sure you want to delete this OLT device?",
      danger: true,
      confirmText: "Delete"
    });
    if (!isConfirm) return;
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

  const activeRouter = routers.find(r => r.id === selectedRouterId);
  const routerLabel = activeRouter 
    ? `${activeRouter.name} (${activeRouter.ipAddress}:${activeRouter.apiPort})`
    : "System Default Router";

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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-white tracking-wide">
            MikroTik Router & OLT Devices
          </h1>
          {routers.length > 0 && (activeTab === "live" || activeTab === "profiles") && (
            <select
              value={selectedRouterId || ""}
              onChange={(e) => setSelectedRouterId(Number(e.target.value))}
              className="glass-input px-3 py-1.5 bg-slate-900 text-white text-sm rounded-xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-neon-blue"
            >
              {routers.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  {r.name} ({r.ipAddress})
                </option>
              ))}
            </select>
          )}
        </div>
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
                  MikroTik Router — {routerLabel}
                </p>
                <p className={`text-sm ${liveData?.routerStatus.ok ? "text-neon-green" : "text-red-400"}`}>
                  {liveData?.routerStatus.ok
                    ? `✓ Connected — RouterOS ${liveData.routerStatus.version}`
                    : `✗ Offline — ${liveData?.routerStatus.error || "Cannot connect"}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {liveData?.routerStatus.ok && (role === "admin" || role === "reseller") && (
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
                    (() => {
                      const totalSecrets = liveData?.secrets || [];
                      const totalSecretsPages = Math.max(1, Math.ceil(totalSecrets.length / secretsPageSize));
                      const currentSecretsPage = Math.min(secretsPage, totalSecretsPages);
                      const startIndex = (currentSecretsPage - 1) * secretsPageSize;
                      const paginatedSecrets = totalSecrets.slice(startIndex, startIndex + secretsPageSize);

                      return paginatedSecrets.map((secret) => {
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
                              {(role === "admin" || role === "reseller") ? (
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
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
            {/* Secrets Pagination */}
            {liveData && liveData.secrets.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-white/2 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-gray-400">
                  Showing <span className="font-semibold text-white">{(Math.min(secretsPage, Math.max(1, Math.ceil(liveData.secrets.length / secretsPageSize))) - 1) * secretsPageSize + 1}</span> to{" "}
                  <span className="font-semibold text-white">
                    {Math.min(Math.min(secretsPage, Math.max(1, Math.ceil(liveData.secrets.length / secretsPageSize))) * secretsPageSize, liveData.secrets.length)}
                  </span>{" "}
                  of <span className="font-semibold text-white">{liveData.secrets.length}</span> secrets
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSecretsPage((prev) => Math.max(prev - 1, 1))}
                    disabled={Math.min(secretsPage, Math.max(1, Math.ceil(liveData.secrets.length / secretsPageSize))) === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Previous
                  </button>
                  
                  {(() => {
                    const totalPages = Math.ceil(liveData.secrets.length / secretsPageSize);
                    const currentSecPage = Math.min(secretsPage, totalPages);
                    const pages = [];
                    const maxVisible = 5;
                    
                    let start = Math.max(1, currentSecPage - 2);
                    let end = Math.min(totalPages, start + maxVisible - 1);
                    
                    if (end - start < maxVisible - 1) {
                      start = Math.max(1, end - maxVisible + 1);
                    }
                    
                    for (let i = start; i <= end; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setSecretsPage(i)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            currentSecPage === i
                              ? "bg-neon-blue text-slate-950 font-bold border-neon-blue shadow-lg shadow-neon-blue/20"
                              : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                  
                  <button
                    onClick={() => setSecretsPage((prev) => Math.min(prev + 1, Math.ceil(liveData.secrets.length / secretsPageSize)))}
                    disabled={Math.min(secretsPage, Math.max(1, Math.ceil(liveData.secrets.length / secretsPageSize))) === Math.ceil(liveData.secrets.length / secretsPageSize)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
                      {(role === "admin" || role === "reseller") && <th className="p-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const totalActive = liveData.active || [];
                      const totalActivePages = Math.max(1, Math.ceil(totalActive.length / activePageSize));
                      const currentActivePage = Math.min(activePage, totalActivePages);
                      const startIndex = (currentActivePage - 1) * activePageSize;
                      const paginatedActive = totalActive.slice(startIndex, startIndex + activePageSize);

                      return paginatedActive.map((session) => (
                        <tr key={session[".id"]} className="hover:bg-white/5">
                          <td className="p-4 text-white font-mono">{session.name}</td>
                          <td className="p-4 text-neon-blue font-mono text-sm">{session.address}</td>
                          <td className="p-4 text-gray-300 text-sm">{session.uptime}</td>
                          <td className="p-4 text-gray-400 text-xs font-mono">{session["caller-id"]}</td>
                          {(role === "admin" || role === "reseller") && (
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDisconnectActive(session[".id"], session.name)}
                                disabled={actionLoading === session[".id"]}
                                title="Disconnect Session (Force Reconnect)"
                                className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors disabled:opacity-50 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
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
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {/* Active Sessions Pagination */}
              {liveData && liveData.active.length > 0 && (
                <div className="p-4 border-t border-white/10 bg-white/2 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-xs text-gray-400">
                    Showing <span className="font-semibold text-white">{(Math.min(activePage, Math.max(1, Math.ceil(liveData.active.length / activePageSize))) - 1) * activePageSize + 1}</span> to{" "}
                    <span className="font-semibold text-white">
                      {Math.min(Math.min(activePage, Math.max(1, Math.ceil(liveData.active.length / activePageSize))) * activePageSize, liveData.active.length)}
                    </span>{" "}
                    of <span className="font-semibold text-white">{liveData.active.length}</span> sessions
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActivePage((prev) => Math.max(prev - 1, 1))}
                      disabled={Math.min(activePage, Math.max(1, Math.ceil(liveData.active.length / activePageSize))) === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Previous
                    </button>
                    
                    {(() => {
                      const totalPages = Math.ceil(liveData.active.length / activePageSize);
                      const currentActPage = Math.min(activePage, totalPages);
                      const pages = [];
                      const maxVisible = 5;
                      
                      let start = Math.max(1, currentActPage - 2);
                      let end = Math.min(totalPages, start + maxVisible - 1);
                      
                      if (end - start < maxVisible - 1) {
                        start = Math.max(1, end - maxVisible + 1);
                      }
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setActivePage(i)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              currentActPage === i
                                ? "bg-neon-blue text-slate-950 font-bold border-neon-blue shadow-lg shadow-neon-blue/20"
                                : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      return pages;
                    })()}
                    
                    <button
                      onClick={() => setActivePage((prev) => Math.min(prev + 1, Math.ceil(liveData.active.length / activePageSize)))}
                      disabled={Math.min(activePage, Math.max(1, Math.ceil(liveData.active.length / activePageSize))) === Math.ceil(liveData.active.length / activePageSize)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create PPPoE user form */}
          {(role === "admin" || role === "reseller") && (
            <AddPppoeForm onSuccess={fetchLiveData} onToast={showToast} profiles={liveData?.profiles || []} routerId={selectedRouterId} />
          )}
        </div>
      )}

      {/* Tab: Routers List */}
      {activeTab === "routers" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                <Server className="text-neon-blue" size={22} />
                MikroTik Router Management
                <span className="text-sm font-normal text-gray-400 bg-slate-800 border border-white/5 px-2.5 py-0.5 rounded-full">
                  Total: {routers.length}
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">Manage, test connection status, and monitor registered MikroTik routers.</p>
            </div>
            {role !== "employee" && (
              <button
                onClick={() => setShowAddRouterModal(true)}
                className="bg-neon-blue/20 text-neon-blue border border-neon-blue/40 hover:bg-neon-blue/35 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-neon-blue/20"
              >
                <Plus size={18} /> Add New Router
              </button>
            )}
          </div>

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
                    {(role === "admin" || role === "reseller") && <th className="p-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {routersLoading && routers.length === 0 ? (
                    <tr>
                      <td colSpan={(role === "admin" || role === "reseller") ? 5 : 4} className="p-8 text-center text-gray-500"><Loader2 size={24} className="animate-spin mx-auto mb-2 text-neon-blue" /> Loading routers...</td>
                    </tr>
                  ) : routers.length === 0 ? (
                    <tr>
                      <td colSpan={(role === "admin" || role === "reseller") ? 5 : 4} className="p-8 text-center text-gray-500">No routers registered yet.</td>
                    </tr>
                  ) : (
                    routers.map((router) => (
                      <tr key={router.id} className="hover:bg-white/5">
                        <td className="p-4">
                          <button
                            onClick={() => {
                              setSelectedRouterId(router.id);
                              setActiveTab("live");
                            }}
                            className="text-left font-bold text-white hover:text-neon-blue hover:underline transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Click to connect and open Live Control"
                          >
                            <Server size={14} className="text-gray-400" />
                            {router.name}
                          </button>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => {
                              setSelectedRouterId(router.id);
                              setActiveTab("live");
                            }}
                            className="text-left font-mono text-gray-300 hover:text-neon-blue hover:underline transition-all cursor-pointer"
                            title="Click to connect and open Live Control"
                          >
                            {router.ipAddress}
                          </button>
                        </td>
                        <td className="p-4 text-gray-300 font-mono">{router.apiPort}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${router.status ? "bg-neon-green/20 text-neon-green border border-neon-green/20" : "bg-red-500/20 text-red-400 border border-red-500/20"}`}>
                            {router.status ? "Active" : "Disabled"}
                          </span>
                        </td>
                        {(role === "admin" || role === "reseller") && (
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() => setEditingRouter(router)}
                              title="Edit Router"
                              className="p-1.5 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleTestRouter(router.id)}
                              disabled={testingRouterId === router.id}
                              title="Test Connection"
                              className="p-1.5 border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {testingRouterId === router.id ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />}
                            </button>
                            <button
                              onClick={() => handleRestoreUsers(router.id)}
                              disabled={restoringRouterId === router.id}
                              title="Restore Missing Users"
                              className="p-1.5 border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {restoringRouterId === router.id ? <Loader2 size={15} className="animate-spin" /> : <DatabaseBackup size={15} />}
                            </button>
                            <button
                              onClick={() => handleToggleRouter(router.id, router.status)}
                              title={router.status ? "Deactivate Router" : "Activate Router"}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${router.status ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30" : "bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border-neon-green/30"}`}
                            >
                              <Power size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteRouter(router.id)}
                              title="Delete Router"
                              className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors cursor-pointer"
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

          {/* Modal: Register New Router */}
          <AnimatePresence>
            {showAddRouterModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Plus className="text-neon-blue" size={20} /> Register New Router
                    </h3>
                    <button 
                      onClick={() => setShowAddRouterModal(false)}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleAddRouter} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Router Name</label>
                      <input name="name" required placeholder="e.g. Core MikroTik" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">IP Address / Domain</label>
                        <input name="ipAddress" required placeholder="e.g. bd2.mikrovpn.xyz" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">API REST Port</label>
                        <input name="apiPort" type="number" defaultValue="13065" required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Web Login User</label>
                        <input name="username" defaultValue="admin" required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Web Login Password</label>
                        <input name="password" type="password" required placeholder="password" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10 bg-white/2 px-6 py-4 -mx-6 -mb-6">
                      <button 
                        type="button" 
                        onClick={() => setShowAddRouterModal(false)}
                        className="px-5 py-2.5 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl font-bold text-sm transition-all cursor-pointer"
                      >
                        Close
                      </button>
                      <button 
                        type="submit" 
                        disabled={addingRouter}
                        className="px-5 py-2.5 bg-neon-blue text-white hover:bg-neon-blue-600 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {addingRouter && <Loader2 size={16} className="animate-spin" />}
                        Save Router
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tab: OLT Devices */}
      {activeTab === "olts" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                <RadioTower className="text-teal-400" size={22} />
                OLT Monitoring System
                <span className="text-sm font-normal text-gray-400 bg-slate-800 border border-white/5 px-2.5 py-0.5 rounded-full">
                  Total: {olts.length}
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">Manage, test connection status, and inspect connected ONU terminals.</p>
            </div>
            {role !== "employee" && (
              <button
                onClick={() => setShowAddOltModal(true)}
                className="bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/35 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-950/20"
              >
                <Plus size={18} /> Add New OLT
              </button>
            )}
          </div>

          {oltsLoading && olts.length === 0 ? (
            <div className="glass-card p-16 text-center text-gray-500 flex flex-col items-center justify-center">
              <Loader2 size={36} className="animate-spin text-teal-400 mb-4" />
              <p className="text-sm font-semibold text-gray-300">Loading OLT configurations...</p>
            </div>
          ) : olts.length === 0 ? (
            <div className="glass-card p-16 text-center text-gray-500 flex flex-col items-center justify-center">
              <RadioTower size={48} className="text-gray-600 mb-4 animate-pulse" />
              <p className="text-sm font-semibold text-gray-300">No OLT devices added yet.</p>
              <p className="text-xs text-gray-500 mt-1">Click the "Add New OLT" button above to register a device.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {olts.map((olt) => {
                // Determine brand color
                let brandColor = "bg-purple-500/15 text-purple-300 border-purple-500/20";
                if (olt.brand?.toLowerCase().includes("vsol")) {
                  brandColor = "bg-pink-500/15 text-pink-300 border-pink-500/20";
                } else if (olt.brand?.toLowerCase().includes("huawei") || olt.brand?.toLowerCase().includes("zte")) {
                  brandColor = "bg-amber-500/15 text-amber-300 border-amber-500/20";
                }

                return (
                  <div key={olt.id} className="glass-card border border-white/10 overflow-hidden hover:border-white/20 transition-all flex flex-col justify-between group relative">
                    <div className="p-6 space-y-4">
                      {/* Title & Badges */}
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-white tracking-wide truncate max-w-[180px]" title={olt.name}>
                            {olt.name}
                          </h3>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {olt.id}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${brandColor}`}>
                            {olt.brand || "BDCOM EPON"}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            olt.status 
                              ? "bg-neon-green/10 text-neon-green border-neon-green/30" 
                              : "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${olt.status ? "bg-neon-green online-pulsing-dot" : "bg-red-500 offline-blink-dot"}`} />
                            {olt.status ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="pt-3 border-t border-white/5 space-y-2 text-xs font-mono text-gray-400">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-500">IP Address:</span>
                          <span className="text-white font-bold">{olt.ipAddress}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-500">Web Port:</span>
                          <span className="text-white font-bold">{olt.webPort || 80} ({olt.protocol || "HTTP"})</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-500">SNMP Port:</span>
                          <span className="text-white font-bold">{olt.connectionPort || 161}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 bg-white/2 border-t border-white/5 flex items-center gap-2">
                      {role !== "employee" && (
                        <button
                          onClick={() => setEditingOlt(olt)}
                          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Edit OLT"
                        >
                          <Edit size={13} /> Edit
                        </button>
                      )}

                      <button
                        onClick={() => handleTestOlt(olt.id)}
                        disabled={testingOltId === olt.id}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                        title="Test Connection"
                      >
                        {testingOltId === olt.id ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />} Test
                      </button>

                      <button
                        onClick={() => handleViewOnuDetails(olt)}
                        className="flex-[1.5] flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/35 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        title="View ONUs List"
                      >
                        <FileText size={13} /> ONUs List
                      </button>

                      {role !== "employee" && (
                        <button
                          onClick={() => handleDeleteOlt(olt.id)}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/30 transition-all flex items-center justify-center cursor-pointer"
                          title="Delete OLT"
                        >
                          <Trash size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal: Register New OLT */}
          <AnimatePresence>
            {showAddOltModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Plus className="text-teal-400" size={20} /> Register New OLT
                    </h3>
                    <button 
                      onClick={() => setShowAddOltModal(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleAddOlt} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">OLT Name</label>
                      <input name="name" required placeholder="e.g. Core OLT 1" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">IP Address</label>
                        <input name="ipAddress" required placeholder="e.g. 192.168.1.100" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">SNMP Port (e.g. 161)</label>
                        <input name="connectionPort" type="number" defaultValue="161" required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Web Port</label>
                        <input name="webPort" type="number" defaultValue="80" required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Protocol</label>
                        <select name="protocol" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white">
                          <option value="HTTP" className="bg-slate-800">HTTP</option>
                          <option value="HTTPS" className="bg-slate-800">HTTPS</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">OLT Brand & Technology Type</label>
                      <select 
                        name="brandSelect" 
                        value={registerBrand}
                        onChange={(e) => setRegisterBrand(e.target.value)}
                        className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white"
                      >
                        <option value="BDCOM EPON" className="bg-slate-800">BDCOM EPON</option>
                        <option value="BDCOM GPON" className="bg-slate-800">BDCOM GPON</option>
                        <option value="VSOL EPON" className="bg-slate-800">VSOL EPON</option>
                        <option value="VSOL GPON" className="bg-slate-800">VSOL GPON</option>
                        <option value="Huawei GPON" className="bg-slate-800">Huawei GPON</option>
                        <option value="ZTE GPON" className="bg-slate-800">ZTE GPON</option>
                        <option value="Ecom EPON" className="bg-slate-800">Ecom EPON</option>
                        <option value="Ecom GPON" className="bg-slate-800">Ecom GPON</option>
                        <option value="CUSTOM" className="bg-slate-800">Other (Custom Brand...)</option>
                      </select>
                      {registerBrand === "CUSTOM" && (
                        <input 
                          type="text" 
                          name="brandCustom" 
                          placeholder="Enter custom OLT brand/tech (e.g., C-Data GPON)" 
                          required 
                          className="mt-2 w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white animate-fadeIn" 
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">OLT Port Count</label>
                      <select name="portCount" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white">
                        <option value="4" className="bg-slate-800">4 Ports</option>
                        <option value="8" className="bg-slate-800">8 Ports</option>
                        <option value="16" className="bg-slate-800">16 Ports</option>
                      </select>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <h4 className="text-sm font-bold text-teal-400 mb-3 flex items-center gap-1.5">
                        🔑 Access Credentials
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Web Login User</label>
                          <input name="username" defaultValue="admin" required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Web Login Password</label>
                          <input name="password" type="password" required placeholder="password" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">SNMP Read Community</label>
                        <input name="snmpCommunity" defaultValue="public" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Timeout (s)</label>
                        <input name="timeout" type="number" defaultValue="10" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10 bg-white/2 px-6 py-4 -mx-6 -mb-6">
                      <button 
                        type="button" 
                        onClick={() => setShowAddOltModal(false)}
                        className="px-5 py-2.5 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl font-bold text-sm transition-all"
                      >
                        Close
                      </button>
                      <button 
                        type="submit" 
                        disabled={addingOlt}
                        className="px-5 py-2.5 bg-teal-500 text-white hover:bg-teal-600 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {addingOlt && <Loader2 size={16} className="animate-spin" />}
                        Add OLT
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Modal: Edit OLT */}
          <AnimatePresence>
            {editingOlt && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Edit className="text-teal-400" size={20} /> Edit OLT Details
                    </h3>
                    <button 
                      onClick={() => setEditingOlt(null)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleEditOlt} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">OLT Name</label>
                      <input name="name" defaultValue={editingOlt.name} required placeholder="e.g. Core OLT 1" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">IP Address</label>
                        <input name="ipAddress" defaultValue={editingOlt.ipAddress} required placeholder="e.g. 192.168.1.100" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">SNMP Port (e.g. 161)</label>
                        <input name="connectionPort" type="number" defaultValue={editingOlt.connectionPort || 161} required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Web Port</label>
                        <input name="webPort" type="number" defaultValue={editingOlt.webPort || 80} required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Protocol</label>
                        <select name="protocol" defaultValue={editingOlt.protocol || "HTTP"} className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white">
                          <option value="HTTP" className="bg-slate-800">HTTP</option>
                          <option value="HTTPS" className="bg-slate-800">HTTPS</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">OLT Brand & Technology Type</label>
                      <select 
                        name="brandSelect" 
                        value={PREDEFINED_BRANDS.includes(editBrand) ? editBrand : "CUSTOM"}
                        onChange={(e) => setEditBrand(e.target.value)}
                        className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white"
                      >
                        <option value="BDCOM EPON" className="bg-slate-800">BDCOM EPON</option>
                        <option value="BDCOM GPON" className="bg-slate-800">BDCOM GPON</option>
                        <option value="VSOL EPON" className="bg-slate-800">VSOL EPON</option>
                        <option value="VSOL GPON" className="bg-slate-800">VSOL GPON</option>
                        <option value="Huawei GPON" className="bg-slate-800">Huawei GPON</option>
                        <option value="ZTE GPON" className="bg-slate-800">ZTE GPON</option>
                        <option value="Ecom EPON" className="bg-slate-800">Ecom EPON</option>
                        <option value="Ecom GPON" className="bg-slate-800">Ecom GPON</option>
                        <option value="CUSTOM" className="bg-slate-800">Other (Custom Brand...)</option>
                      </select>
                      {(!PREDEFINED_BRANDS.includes(editBrand) || editBrand === "CUSTOM") && (
                        <input 
                          type="text" 
                          name="brandCustom" 
                          defaultValue={PREDEFINED_BRANDS.includes(editBrand) ? "" : editBrand}
                          placeholder="Enter custom OLT brand/tech (e.g., C-Data GPON)" 
                          required 
                          className="mt-2 w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white animate-fadeIn" 
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">OLT Port Count</label>
                      <select name="portCount" defaultValue={editingOlt.portCount} className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white">
                        <option value="4" className="bg-slate-800">4 Ports</option>
                        <option value="8" className="bg-slate-800">8 Ports</option>
                        <option value="16" className="bg-slate-800">16 Ports</option>
                      </select>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <h4 className="text-sm font-bold text-teal-400 mb-3 flex items-center gap-1.5">
                        🔑 Access Credentials
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Telnet User</label>
                          <input name="username" defaultValue={editingOlt.username || ""} required className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Telnet Password</label>
                          <input name="password" type="password" defaultValue={editingOlt.password || ""} required placeholder="password" className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">SNMP Read Community</label>
                        <input name="snmpCommunity" defaultValue={editingOlt.snmpCommunity || "public"} className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Timeout (s)</label>
                        <input name="timeout" type="number" defaultValue={editingOlt.timeout || 10} className="w-full glass-input px-4 py-2.5 bg-slate-800 text-sm text-white" />
                      </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10 bg-white/2 px-6 py-4 -mx-6 -mb-6">
                      <button 
                        type="button" 
                        onClick={() => setEditingOlt(null)}
                        className="px-5 py-2.5 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl font-bold text-sm transition-all"
                      >
                        Close
                      </button>
                      <button 
                        type="submit" 
                        disabled={addingOlt}
                        className="px-5 py-2.5 bg-teal-500 text-white hover:bg-teal-600 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {addingOlt && <Loader2 size={16} className="animate-spin" />}
                        Save Changes
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tab: Speed Profiles */}
      {activeTab === "profiles" && (
        <div className={(role === "admin" || role === "reseller") ? "grid lg:grid-cols-3 gap-8" : "space-y-6"}>
          <div className={(role === "admin" || role === "reseller") ? "lg:col-span-2 space-y-6" : "space-y-6"}>
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
                      {(role === "admin" || role === "reseller") && <th className="p-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {liveLoading && (!liveData || liveData.profiles.length === 0) ? (
                      <tr>
                        <td colSpan={(role === "admin" || role === "reseller") ? 5 : 4} className="p-8 text-center text-gray-500">
                          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-neon-blue" /> Loading profiles...
                        </td>
                      </tr>
                    ) : !liveData || liveData.profiles.length === 0 ? (
                      <tr>
                        <td colSpan={(role === "admin" || role === "reseller") ? 5 : 4} className="p-8 text-center text-gray-500">No profiles found on router.</td>
                      </tr>
                    ) : (
                      liveData.profiles.map((prof) => (
                        <tr key={prof[".id"]} className="hover:bg-white/5">
                          <td className="p-4 text-white font-bold">{prof.name}</td>
                          <td className="p-4 text-gray-300 font-mono text-sm">{prof["local-address"] || "—"}</td>
                          <td className="p-4 text-gray-300 font-mono text-sm">{prof["remote-address"] || "—"}</td>
                          <td className="p-4 text-neon-green font-semibold">{prof["rate-limit"] || "Unlimited"}</td>
                          {(role === "admin" || role === "reseller") && (
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

          {(role === "admin" || role === "reseller") && (
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

      {/* Edit Router Modal */}
      {editingRouter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md glass-card p-6 space-y-4 border border-white/20"
          >
            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Edit size={18} className="text-neon-blue" /> Edit Router Details
            </h3>
            <form onSubmit={handleEditRouter} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Router Name</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingRouter.name}
                  required
                  placeholder="e.g. Core MikroTik"
                  className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">IP Address / Domain</label>
                <input
                  name="ipAddress"
                  type="text"
                  defaultValue={editingRouter.ipAddress}
                  required
                  placeholder="e.g. bd2.mikrovpn.xyz"
                  className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">API REST Port</label>
                <input
                  name="apiPort"
                  type="number"
                  defaultValue={editingRouter.apiPort}
                  required
                  className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Username</label>
                <input
                  name="username"
                  type="text"
                  defaultValue={editingRouter.username || "admin"}
                  required
                  className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Password</label>
                <input
                  name="password"
                  type="password"
                  defaultValue={editingRouter.password || ""}
                  required
                  placeholder="password"
                  className="w-full glass-input px-4 py-2.5 bg-slate-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRouter(null)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-gray-300 border border-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRouter}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {addingRouter ? (
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

function AddPppoeForm({ onSuccess, onToast, profiles, routerId }: { onSuccess: () => void; onToast: (msg: string, ok: boolean) => void; profiles: PppoeProfile[]; routerId: number | null }) {
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
      body: JSON.stringify({ action: "create", name, password, profile, routerId }),
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
