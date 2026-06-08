"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Edit, Phone, MapPin, Wifi, Package, CreditCard, IdCard, 
  ArrowLeft, Download, Upload, Clock, FileText, Activity, 
  Loader2, Eye, EyeOff, Terminal, RotateCcw, Router, ShieldCheck, CheckCircle2, XCircle, Save, KeyRound, Search, Plus, MoreHorizontal, Zap, Trash, MessageSquare, ShieldAlert, X, Power, DollarSign, Calendar, Percent, RefreshCcw, UserPlus
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { usePopup } from "@/components/ui/PopupProvider";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import AvatarImage from "@/components/ui/AvatarImage";

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  photoUrl: string | null;
  nidUrl: string | null;
  nidNumber?: string | null;
  pppoeUsername: string | null;
  macAddress: string | null;
  package?: { name: string; speed: string; price: string } | null;
  status: string | null;
  role: string;
  createdAt?: string | Date | null;
  expireDate?: string | Date | null;
  dob?: string | Date | null;
  areaId?: number | null;
  customerType?: string | null;
  connectionFee?: string | null;
  promiseDate?: string | Date | null;
  note?: string | null;
  balance?: string | null;
  walletBalance?: string | null;
  ponPort?: string | null;
  onuMac?: string | null;
  ipAddress?: string | null;
  olt?: { name: string; ipAddress: string } | null;
  routerUsername?: string | null;
  routerPassword?: string | null;
  routerModel?: string | null;
  mikrotikId?: number | null;
}

const toLocalDatetimeString = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

interface Payment {
  id: number;
  amount: string;
  method: string | null;
  status: string | null;
  createdAt: string | Date | null;
}

interface Invoice {
  id: number;
  amount: string;
  status: string | null;
  dueDate: string | Date | null;
}

interface UsageRecord {
  recordedAt: string | Date | null;
  downloadGb: number | string;
  uploadGb: number | string;
}

export default function CustomerProfileClient({
  customer,
  payments,
  invoices,
  usageHistory,
  isOnline,
  activeSession,
  plainTextPassword,
  role = "admin",
  currentCredit = 0,
  remainingDays = 0,
  monthlyDownloadGb = 0,
  monthlyUploadGb = 0
}: {
  customer: Customer;
  payments: Payment[];
  invoices: Invoice[];
  usageHistory: UsageRecord[];
  isOnline: boolean;
  activeSession?: any;
  plainTextPassword?: string;
  role?: "admin" | "reseller" | "employee";
  currentCredit?: number;
  remainingDays?: number;
  monthlyDownloadGb?: number;
  monthlyUploadGb?: number;
}) {
  const basePath = role === "reseller" ? "/reseller" : role === "employee" ? "/employee" : "/admin";

  const [activeTab, setActiveTab] = useState<"service" | "billing" | "activity" | "ledger">("service");
  
  // Modals for tools
  const [showPingModal, setShowPingModal] = useState(false);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [toolOutput, setToolOutput] = useState("");

  const [liveDownloadRate, setLiveDownloadRate] = useState<number>(0);
  const [liveUploadRate, setLiveUploadRate] = useState<number>(0);
  const [accumulatedDownloadBytes, setAccumulatedDownloadBytes] = useState<number>(0);
  const [accumulatedUploadBytes, setAccumulatedUploadBytes] = useState<number>(0);
  // Real session bytes directly from MikroTik (bytes-in = upload from router perspective = download for customer)
  const [sessionBytesIn, setSessionBytesIn] = useState<number>(0);
  const [sessionBytesOut, setSessionBytesOut] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [rechargeCustomer, setRechargeCustomer] = useState<any | null>(null);
const [billType, setBillType] = useState<"bill" | "advance">("bill");
  const [billingType, setBillingType] = useState<"monthly" | "daily">("monthly");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [discount, setDiscount] = useState<string>("0");
  const [rechargeDays, setRechargeDays] = useState<string>("30");
  const [rechargeMethod, setRechargeMethod] = useState<string>("হ্যান্ড ক্যাশ");
  const [showNoteDate, setShowNoteDate] = useState(false);
  const [renewBack, setRenewBack] = useState(true);
  const [modalAutoRenew, setModalAutoRenew] = useState(false);
  const [rechargeNote, setRechargeNote] = useState("");
  const [customBaseDate, setCustomBaseDate] = useState<string>("");
  const [customExpireDate, setCustomExpireDate] = useState<string>("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeSuccessMessage, setRechargeSuccessMessage] = useState<string | null>(null);
  const [selectedNewPackageId, setSelectedNewPackageId] = useState<string>("");

  const [smsCustomer, setSmsCustomer] = useState<any | null>(null);
  const [showSmsModal2, setShowSmsModal2] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [packagesList, setPackagesList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/packages")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPackagesList(data);
      })
      .catch(() => {});
  }, []);

  // Manual overrides for Recharge Modal fields
  const [overrideCalculated, setOverrideCalculated] = useState<string>("");
  const [overridePaid, setOverridePaid] = useState<string>("");
  const [overrideDue, setOverrideDue] = useState<string>("");

  


  // Profile states
  const [displayNidNumber, setDisplayNidNumber] = useState(customer.nidNumber || "");
  const [displayCreatedAt, setDisplayCreatedAt] = useState<Date | null>(customer.createdAt ? new Date(customer.createdAt) : null);
  const [displayExpireDate, setDisplayExpireDate] = useState<Date | null>(customer.expireDate ? new Date(customer.expireDate) : null);

  const { showConfirm, showAlert } = usePopup();

  const [displayDob, setDisplayDob] = useState<Date | null>(customer.dob ? new Date(customer.dob) : null);
  const [areas, setAreas] = useState<any[]>([]);

  // Real ONU Data State
  const [onuData, setOnuData] = useState({
    rxPower: "—",
    txPower: "—",
    temperature: "—",
    voltage: "—",
    distance: "—",
    uptime: "—",
    routerModel: "Unknown",
    routerVendor: null as string | null,
    ipAddress: null as string | null,
    onuMac: null as string | null,
    isRxGood: false
  });
  const [resolvedRouter, setResolvedRouter] = useState<any | null>(null);
  const [resolvedRouterLoading, setResolvedRouterLoading] = useState(false);
  const [resolvedRouterError, setResolvedRouterError] = useState<string | null>(null);
  
  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeCustomer) return;

    setRechargeLoading(true);
    try {
      const res = await fetch("/api/admin/customers/recharge-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: rechargeCustomer.id,
          amount: parseFloat(displayPaid) || 0,
          due: parseFloat(displayDue) || 0,
          billingType,
          duration: durationVal,
          method: rechargeMethod,
          discount: parseFloat(discount) || 0,
          note: showNoteDate ? rechargeNote : "",
          renewBack,
          autoRenew: modalAutoRenew,
          newPackageId: selectedNewPackageId ? Number(selectedNewPackageId) : undefined,
          customBaseDate: customBaseDate ? customBaseDate : undefined,
          customExpireDate: customExpireDate ? customExpireDate : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRechargeSuccessMessage(data.message || "Recharged successfully!");
        setRechargeCustomer(null);
      } else {
        await showAlert({ title: "Failed", message: data.error || "Failed to recharge", type: "error" });
      }
    } catch {
      await showAlert({ title: "Error", message: "Network error", type: "error" });
    } finally {
      setRechargeLoading(false);
    }
  };

  

  const triggerSuspend = async () => {
    if (!window.confirm("Are you sure you want to suspend this customer?")) return;
    try {
      await fetch("/api/admin/customers/" + customer.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "expired" }) });
      window.location.reload();
    } catch {}
  };
  const triggerDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this customer? This cannot be undone.")) return;
    try {
      await fetch("/api/admin/customers/" + customer.id, { method: "DELETE" });
      window.location.href = "/admin/customers";
    } catch {}
  };
  const triggerNote = async () => {
    const note = prompt("Edit note:", customer.address || "");
    if (note !== null) {
      await fetch("/api/admin/customers/" + customer.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: note }) });
      window.location.reload();
    }
  };
useEffect(() => {
    fetch(`/api/admin/customers/${customer.id}/diagnostics`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setOnuData({
            rxPower: data.rxPower,
            txPower: data.txPower,
            temperature: data.temperature,
            voltage: data.voltage,
            distance: data.distance,
            uptime: data.uptime,
            routerModel: data.routerModel,
            routerVendor: data.routerVendor || null,
            ipAddress: data.ipAddress || null,
            onuMac: data.onuMac || null,
            isRxGood: parseFloat(data.rxPower) >= -27
          });
        }
      })
      .catch(() => {});
  }, [customer.id]);

  // Fetch router system info directly from router (real-time board name)
  useEffect(() => {
    if (!customer.mikrotikId) return;
    let active = true;
    fetch(`/api/admin/mikrotik/${customer.mikrotikId}/system`)
      .then(r => r.json())
      .then(data => {
        if (!active) return;
        if (!data.error && data.boardName) {
          setOnuData(prev => ({ ...prev, routerModel: data.boardName }));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [customer.mikrotikId]);

  // Resolve router by IP or MAC to show router name in Device Info
  useEffect(() => {
    let active = true;
    const ip = activeSession?.address || customer.ipAddress;
    const mac = activeSession?.["caller-id"] || customer.macAddress;
    if (!ip && !mac) return;

    (async () => {
      setResolvedRouterLoading(true);
      setResolvedRouterError(null);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('/api/admin/tools/resolve-router', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip, mac }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json();
        console.debug('resolve-router response', { status: res.status, data });
        if (!active) return;
        if (res.ok && data.found) {
          if (data.source === 'db-user' && data.router) setResolvedRouter({ name: data.router.name, source: data.source, router: data.router });
          else if (data.source === 'router-scan' && data.result && data.result.router) setResolvedRouter({ name: data.result.router.name, source: data.source, router: data.result.router, hit: data.result.hit });
          else setResolvedRouter({ name: data.router?.name || data.result?.router?.name || null, source: data.source || 'unknown', raw: data });
        } else if (res.ok && !data.found) {
          setResolvedRouter(null);
        } else {
          setResolvedRouterError(data.error || `Status ${res.status}`);
        }
      } catch (e: any) {
        console.debug('resolve-router fetch error', e?.name || e?.message || e);
        if (!active) return;
        if (e?.name === 'AbortError') setResolvedRouterError('timeout');
        else setResolvedRouterError(String(e));
      } finally {
        setResolvedRouterLoading(false);
      }
    })();

    return () => { active = false; };
  }, [customer.id, customer.ipAddress, customer.macAddress, activeSession]);

  const { rxPower, txPower, temperature: onuTemp, voltage: onuVoltage, distance: onuDistance, uptime: onuUptime, routerModel: wifiRouterModel, routerVendor: wifiRouterVendor, isRxGood } = onuData;

  useEffect(() => {
    fetch("/api/admin/areas").then(r => r.json()).then(setAreas).catch(() => {});
  }, []);

  const [liveData, setLiveData] = useState<{ name: string; download: number; upload: number }[]>(() => 
    Array.from({ length: 15 }).map((_, i) => ({ name: `-${15 - i}s`, download: 0, upload: 0 }))
  );
  const [sessionUptimeSeconds, setSessionUptimeSeconds] = useState<number>(0);
  const [chartMode, setChartMode] = useState<"live" | "history">("live");

  const chartData = usageHistory.map((d: any) => ({
    name: new Date(d.recordedAt || "").toLocaleDateString("en-US", { weekday: "short" }),
    download: parseFloat(String(d.downloadGb || 0)),
    upload: parseFloat(String(d.uploadGb || 0)),
  }));

  useEffect(() => {
    if (customer.status !== "active") return;
    let active = true;
    const interval = setInterval(async () => {
      let dl = 0, ul = 0;
      try {
        const res = await fetch(`/api/admin/customers/${customer.id}/traffic`);
        const data = await res.json();
        if (res.ok && data.isOnline) {
          // txBps = router sends to client = download speed for client
          dl = parseFloat((data.txBps / 1000000).toFixed(3));
          // rxBps = router receives from client = upload speed for client
          ul = parseFloat((data.rxBps / 1000000).toFixed(3));
          // bytesIn/Out from MikroTik = actual session bytes (most accurate)
          // MikroTik: bytes-in = data received by router FROM client (client upload)
          //           bytes-out = data sent by router TO client (client download)
          if (data.bytesOut !== undefined) setSessionBytesIn(data.bytesOut);  // client download
          if (data.bytesIn !== undefined) setSessionBytesOut(data.bytesIn);   // client upload
        }
      } catch (e) {}
      if (!active) return;

      if (dl > 0 || ul > 0) {
        setSessionUptimeSeconds(prev => prev + 1);
      } else {
        setSessionUptimeSeconds(0);
      }

      setLiveDownloadRate(dl);
      setLiveUploadRate(ul);

      const dlBytes = Math.round((dl * 1000000) / 8);
      const ulBytes = Math.round((ul * 1000000) / 8);
      setAccumulatedDownloadBytes((p) => p + dlBytes);
      setAccumulatedUploadBytes((p) => p + ulBytes);

      setLiveData((prev) => {
        const timeStr = new Date().toLocaleTimeString(undefined, { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }).slice(-5);
        return [...prev.slice(1), { name: timeStr, download: dl, upload: ul }];
      });
    }, 1000);
    return () => { active = false; clearInterval(interval); };
  }, [customer.id, customer.status]);

  // Keep values as exact numbers (no toFixed rounding until display formatting)
  const totalDownloadBytes = (monthlyDownloadGb * (1024 ** 3)) + accumulatedDownloadBytes;
  const totalUploadBytes = (monthlyUploadGb * (1024 ** 3)) + accumulatedUploadBytes;

  function formatSpeed(val: any) {
    const rate = parseFloat(val);
    if (isNaN(rate) || rate < 0.001) return "0 Kbps";
    if (rate < 1) return `${Math.round(rate * 1000)} Kbps`;
    return `${rate.toFixed(1)} Mbps`;
  }

  function formatSpeedNumberOnly(val: number) {
    if (isNaN(val) || val < 0) return "0.00";
    return val.toFixed(2);
  }

  function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  const handleReboot = async () => {
    const isConfirm = await showConfirm({
      title: "Reboot ONU",
      message: "Are you sure you want to reboot the ONU?",
      confirmText: "Reboot",
    });
    if (isConfirm) {
      setIsRebooting(true);
      setTimeout(() => setIsRebooting(false), 3000);
      showAlert({ title: "Success", message: "ONU Reboot command sent successfully", type: "success" });
    }
  };



  const getMonthsList = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const mName = date.toLocaleString("default", { month: "long", year: "numeric" });
      months.push(mName);
      date.setMonth(date.getMonth() + 1);
    }
    return months;
  };

  const selectedNewPkg = selectedNewPackageId ? packagesList.find((p: any) => String(p.id) === selectedNewPackageId) : null;
  const monthlyPrice = selectedNewPkg
    ? parseFloat(selectedNewPkg.price || "0")
    : rechargeCustomer ? parseFloat(rechargeCustomer.package?.price || "0") : 0;
  let calculatedAmount = 0;
  let durationVal = 1;

  if (billingType === "monthly") {
    if (customBaseDate && customExpireDate) {
      const start = new Date(customBaseDate);
      const end = new Date(customExpireDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        durationVal = Math.max(1, Math.round(diffDays / 30));
      } else {
        durationVal = 1;
      }
    } else {
      durationVal = 1;
    }
    calculatedAmount = monthlyPrice * durationVal;
  } else {
    const daysVal = parseInt(rechargeDays) || 1;
    durationVal = daysVal;
    const dailyRate = monthlyPrice / 30;
    calculatedAmount = Math.round(dailyRate * daysVal);
  }

  const displayCalculated = overrideCalculated !== "" ? overrideCalculated : String(calculatedAmount);
  const currentCalculatedVal = parseFloat(displayCalculated) || 0;
  const currentDiscountVal = parseFloat(discount) || 0;
  const finalAmount = Math.max(0, currentCalculatedVal - currentDiscountVal);

  let displayPaid = String(finalAmount);
  let displayDue = "0";

  if (overrideDue !== "") {
    const dueVal = parseFloat(overrideDue) || 0;
    displayDue = overrideDue;
    displayPaid = String(finalAmount - dueVal);
  } else if (overridePaid !== "") {
    const paidVal = parseFloat(overridePaid) || 0;
    displayPaid = overridePaid;
    displayDue = String(finalAmount - paidVal);
  }



  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCustomer) return;
    setSmsLoading(true);
    try {
      const res = await fetch("/api/admin/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: smsCustomer.phone,
          message: smsText
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("SMS sent successfully!");
        setShowSmsModal2(false);
        setSmsCustomer(null);
        setSmsText("");
      } else {
        alert("Failed to send SMS: " + data.error);
      }
    } catch {
      alert("Network error");
    } finally {
      setSmsLoading(false);
    }
  };

  const handleForceDisconnect = async () => {
    if (!customer.pppoeUsername) {
      await showAlert({ title: "Error", message: "This customer doesn't have a PPPoE username assigned.", type: "error" });
      return;
    }
    const isConfirm = await showConfirm({
      title: "Force Disconnect",
      message: `Are you sure you want to disconnect ${customer.name} from the router?`,
      danger: true,
      confirmText: "Disconnect"
    });
    if (!isConfirm) return;
    
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          name: customer.pppoeUsername,
          routerId: customer.mikrotikId,
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await showAlert({ title: "Disconnected", message: data.message || "Disconnected successfully.", type: "success" });
      } else {
        await showAlert({ title: "Failed", message: "Failed to disconnect: " + (data.error || "Unknown error"), type: "error" });
      }
    } catch (e) {
      await showAlert({ title: "Error", message: "Failed to send disconnect command.", type: "error" });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handlePing = async () => {
    setShowPingModal(true);
    const ip = activeSession?.address || customer.ipAddress;
    if (!ip) {
      setToolOutput("Error: No active IP address found for customer to ping.");
      return;
    }
    setToolOutput(`Pinging ${ip}...\n`);
    try {
      const res = await fetch("/api/admin/tools/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      setToolOutput(data.result || data.error || "Unknown error occurred.");
    } catch (e) {
      setToolOutput("Failed to execute ping command on server.");
    }
  };

  const handleTraceRoute = async () => {
    setShowTraceModal(true);
    const ip = activeSession?.address || customer.ipAddress;
    if (!ip) {
      setToolOutput("Error: No active IP address found for customer to trace.");
      return;
    }
    setToolOutput(`Tracing route to ${ip}...\n`);
    try {
      const res = await fetch("/api/admin/tools/traceroute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      setToolOutput(data.result || data.error || "Unknown error occurred.");
    } catch (e) {
      setToolOutput("Failed to execute traceroute command on server.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Profile & Top Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Card: Identity */}
        <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 left-4 z-50">
            <button
              onClick={() => setActiveDropdownId(activeDropdownId === customer.id ? null : customer.id)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all shadow-lg border border-white/10 flex items-center gap-2"
            >
              <MoreHorizontal size={18} /> <span className="text-xs font-bold">অ্যাকশন (Actions)</span>
            </button>
            {activeDropdownId === customer.id && (
              <div className="absolute left-0 mt-2 w-56 rounded-xl bg-slate-900 border border-white/10 shadow-2xl z-50 py-1 text-left overflow-hidden">
                <button
                  onClick={() => { setRechargeCustomer(customer); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Zap size={13} className="text-neon-green" /> রিচার্জ করুন (Recharge)
                </button>
                <Link 
                  href={"/admin/customers/" + customer.id + "/edit"}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Edit size={13} /> এডিট (Edit)
                </Link>
                <Link 
                  href={"/admin/tickets?userId=" + customer.id}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FileText size={13} /> টিকেট (Ticket List)
                </Link>
                <button
                  onClick={() => { triggerNote(); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FileText size={13} /> নোট (Note)
                </button>
                <button
                  onClick={() => { triggerDelete(); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash size={13} /> ডিলিট (Delete)
                </button>
                <button
                  onClick={() => { setSmsCustomer(customer); setShowSmsModal2(true); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <MessageSquare size={13} /> মেসেজ (Send SMS)
                </button>
                <button
                  onClick={() => { triggerSuspend(); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <ShieldAlert size={13} /> Suspend (লাইন বন্ধ করুন)
                </button>
                <Link 
                  href={"/admin/tickets"}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <ShieldAlert size={13} /> ওপেন সাপোর্ট টিকেট
                </Link>
                <Link 
                  href={"/admin/logs"}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Activity size={13} /> অ্যাক্টিভিটি লগ (Logs)
                </Link>
              </div>
            )}
          </div>
          <div className="absolute top-4 right-4">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
              isOnline ? "bg-neon-green/10 text-neon-green border-neon-green/30" : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-neon-green animate-ping" : "bg-red-500"}`} />
              {isOnline ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-neon-blue to-purple-500 flex items-center justify-center mb-4 text-3xl font-bold text-white shadow-lg shadow-neon-blue/20 overflow-hidden">
            <AvatarImage 
              src={customer.photoUrl} 
              fallbackText={customer.name.charAt(0).toUpperCase()} 
            />
          </div>
          <h2 className="text-2xl font-bold text-white text-center">{customer.name}</h2>
          <p className="text-gray-400 text-sm">{customer.phone} • {customer.pppoeUsername}</p>
          
          <button 
            onClick={handleForceDisconnect}
            disabled={isDisconnecting || !isOnline}
            className={`mt-6 w-full py-3 border font-bold rounded-xl transition-all flex justify-center items-center gap-2 ${
              isDisconnecting || !isOnline 
                ? "bg-gray-500/10 border-gray-500/30 text-gray-500 cursor-not-allowed" 
                : "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
            }`}
          >
            {isDisconnecting ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />} 
            {isDisconnecting ? "Disconnecting..." : "Force Disconnect"}
          </button>
        </div>

        {/* Middle Card: Package & Billing */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 flex items-center gap-2">
            <Package size={18} className="text-neon-blue" /> Package Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-sm text-gray-400">Current Plan</span>
              <span className="font-bold text-neon-blue">{customer.package?.name || "N/A"} ({customer.package?.speed || "0 Mbps"})</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-sm text-gray-400">Monthly Fee</span>
              <span className="font-bold text-white">৳ {customer.package?.price || "0"}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-sm text-gray-400">Expiry Date & Time</span>
              <span className={`font-bold ${customer.status === 'expired' ? 'text-red-400' : 'text-neon-green'}`}>
                {displayExpireDate ? displayExpireDate.toLocaleString() : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-sm text-gray-400">Credit Days Left</span>
              <span className="font-bold text-teal-400">
                {remainingDays && remainingDays > 0 
                  ? `${Math.floor(remainingDays)} Days ${Math.floor((remainingDays % 1) * 24)} Hours (৳ ${currentCredit?.toFixed(2) || "0.00"})` 
                  : "0 Days (৳ 0.00)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Usage Chart */}
      <div className="glass-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-5 border-b border-white/10 pb-2 flex items-center justify-between flex-wrap gap-2">
          <span>{chartMode === "live" ? "Real-time Traffic Monitor" : "Data Usage History"}</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 no-print">
              {chartMode === "live" ? "Live Traffic Speed" : `Cumulative: Down ${formatBytes(totalDownloadBytes)} / Up ${formatBytes(totalUploadBytes)}`}
            </span>
            <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl no-print border border-white/10">
              <button
                type="button"
                onClick={() => setChartMode("history")}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  chartMode === "history"
                    ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Historical (GB)
              </button>
              <button
                type="button"
                onClick={() => setChartMode("live")}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  chartMode === "live"
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full bg-neon-green ${chartMode === "live" ? "animate-pulse" : ""}`} />
                Live Rate
              </button>
            </div>
          </div>
        </h3>

        {chartMode === "history" ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3 border border-red-500/20">
                <div className="text-red-500"><Download size={24} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Downloaded</p>
                  <p className="text-2xl font-bold text-white font-mono">{formatBytes(totalDownloadBytes)}</p>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3 border border-green-500/20">
                <div className="text-green-500"><Upload size={24} /></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Uploaded</p>
                  <p className="text-2xl font-bold text-white font-mono">{formatBytes(totalUploadBytes)}</p>
                </div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="historyDownGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="historyUpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} />
                  <YAxis stroke="#9ca3af" fontSize={11} unit=" GB" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }} 
                    formatter={(value: any, name: any) => [`${value} GB`, name === "download" ? "Download" : "Upload"]}
                  />
                  <Area type="monotone" dataKey="download" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 4 }} fill="url(#historyDownGrad)" />
                  <Area type="monotone" dataKey="upload" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 4 }} fill="url(#historyUpGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card p-6 mb-6">

              {/* Speed cards — top row */}
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                {/* Download Speed Card */}
                <div className="p-4 bg-white/5 rounded-xl border border-red-500/20 relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Live
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-red-500"><Download size={24} /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Download Speed</p>
                      <p className="text-2xl font-bold text-white font-mono">{formatSpeed(liveDownloadRate)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Session: <span className="text-red-400 font-semibold">{formatBytes(sessionBytesIn)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Speed Card */}
                <div className="p-4 bg-white/5 rounded-xl border border-green-500/20 relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Live
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-500"><Upload size={24} /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Upload Speed</p>
                      <p className="text-2xl font-bold text-white font-mono">{formatSpeed(liveUploadRate)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Session: <span className="text-green-400 font-semibold">{formatBytes(sessionBytesOut)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveData}>
                    <defs>
                      <linearGradient id="liveDownGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="liveUpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={formatSpeed} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "rgba(15,23,42,.95)", borderColor: "rgba(255,255,255,.1)", borderRadius: 12 }}
                      formatter={(value: any, name: any) => [formatSpeed(Number(value)), name === "download" ? "Download" : "Upload"]}
                    />
                    <Area type="monotone" dataKey="download" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 4 }} fill="url(#liveDownGrad)" />
                    <Area type="monotone" dataKey="upload" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 4 }} fill="url(#liveUpGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Live Session Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session ↓</p>
                  <p className="text-sm text-red-400 font-mono font-bold">{formatBytes(sessionBytesIn)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">MikroTik Actual</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session ↑</p>
                  <p className="text-sm text-green-400 font-mono font-bold">{formatBytes(sessionBytesOut)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">MikroTik Actual</p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session Total</p>
                  <p className="text-sm text-white font-mono font-bold">{formatBytes(sessionBytesIn + sessionBytesOut)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">↓+↑ Combined</p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Monthly Total</p>
                  <p className="text-sm text-blue-400 font-mono font-bold">{formatBytes(totalDownloadBytes + totalUploadBytes)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">DB Record</p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg text-center col-span-2 md:col-span-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Session Uptime</p>
                  <p className="text-sm text-white font-mono font-bold">{formatUptime(sessionUptimeSeconds)}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Active Time</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>



      {/* Device Info & ONU Diagnostics */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Device Info */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-4 mb-4 flex items-center gap-2">
            <Router size={18} className="text-neon-blue" /> Device Information
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase font-semibold">WiFi Router Brand</p>
                <p className="font-semibold text-white mt-0.5">{wifiRouterVendor || wifiRouterModel}</p>
              </div>
              <Wifi size={20} className="text-gray-500" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Router Admin User</p>
                <p className="font-semibold text-white mt-0.5 font-mono text-sm">{customer.routerUsername || customer.pppoeUsername || "—"}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Router Admin Pass</p>
                <p className="font-semibold text-white mt-0.5 font-mono text-sm">{customer.routerPassword || plainTextPassword || "—"}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Detected Router</p>
                <p className="font-semibold text-white mt-0.5 text-sm">{resolvedRouter?.name || (customer.mikrotikId ? `Router ID ${customer.mikrotikId}` : "—")}</p>
                {resolvedRouterLoading && <p className="text-[11px] text-gray-400 mt-1">Resolving...</p>}
                {resolvedRouterError && <p className="text-[11px] text-rose-400 mt-1">Error: {resolvedRouterError}</p>}
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">OLT Name / Port</p>
                <p className="font-semibold text-white mt-0.5 text-sm">{customer.olt?.name || "N/A"}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">ONU Distance</p>
                <p className="font-semibold text-white mt-0.5 text-sm">{onuDistance}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 col-span-2">
                <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Live Tracking (IP & MAC)</p>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">IP:</span>
                    <span className="text-xs text-neon-blue font-mono font-semibold">{activeSession?.address || customer.ipAddress || "Offline"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">MAC:</span>
                    <span className="text-xs text-neon-blue font-mono font-semibold">{activeSession?.["caller-id"] || customer.macAddress || "Offline"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ONU Diagnostics */}
        <div className="glass-card p-6 border border-teal-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal-400" /> ONU Diagnostics
              </h3>
              <button 
                onClick={handleReboot}
                disabled={isRebooting}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded flex items-center gap-1.5 transition-all"
              >
                {isRebooting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Reboot ONU
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${
                isRxGood ? "bg-neon-green/5 border-neon-green/30" : "bg-red-500/5 border-red-500/30"
              }`}>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Rx Power</span>
                <span className={`text-2xl font-bold ${isRxGood ? "text-neon-green" : "text-red-400"}`}>{rxPower}</span>
                <span className="text-[10px] text-gray-500 mt-1">dBm</span>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tx Power</span>
                <span className="text-2xl font-bold text-white">{txPower}</span>
                <span className="text-[10px] text-gray-500 mt-1">dBm</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-900/50 p-2 rounded text-center border border-white/5">
                <span className="block text-[9px] text-gray-400 uppercase">Temp</span>
                <span className="text-sm font-semibold text-amber-300">{onuTemp} °C</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded text-center border border-white/5">
                <span className="block text-[9px] text-gray-400 uppercase">Voltage</span>
                <span className="text-sm font-semibold text-teal-300">{onuVoltage} V</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded text-center border border-white/5">
                <span className="block text-[9px] text-gray-400 uppercase">Uptime</span>
                <span className="text-sm font-semibold text-white">{onuUptime}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handlePing} className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-300 flex justify-center items-center gap-1.5 transition-all">
                <Terminal size={14} /> Ping Report
              </button>
              <button onClick={handleTraceRoute} className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-300 flex justify-center items-center gap-1.5 transition-all">
                <Activity size={14} /> Trace Route
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Bottom Tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-white/10 no-scrollbar">
          {[
            { id: "service", label: "Service Details" },
            { id: "billing", label: "Billing Details" },
            { id: "activity", label: "Activity Log" },
            { id: "ledger", label: "Ledger" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? "text-neon-blue border-b-2 border-neon-blue bg-white/5" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {activeTab === "service" && (
            <div className="grid md:grid-cols-2 gap-4">
              <Info icon={<Phone size={18} />} label="Phone" value={customer.phone} />
              <Info icon={<KeyRound size={18} />} label="PPPoE Username" value={customer.pppoeUsername || activeSession?.name || "Not set"} />
              <Info icon={<MapPin size={18} />} label="Address" value={customer.address || "Not set"} />
              <div className="p-4 bg-white/5 rounded-xl flex items-start justify-between gap-3 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="text-neon-blue mt-1"><Wifi size={18} /></div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">PPPoE Password</p>
                    <p className="text-white font-medium">{showPassword ? (plainTextPassword || "••••••••") : "••••••••"}</p>
                  </div>
                </div>
                {plainTextPassword && (
                  <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              <Info icon={<IdCard size={18} />} label="NID Number" value={displayNidNumber || "Not set"} />
              <Info icon={<Clock size={18} />} label="Date of Birth" value={displayDob ? displayDob.toLocaleDateString() : "Not set"} />
              <Info icon={<MapPin size={18} />} label="Assigned Area" value={areas.find(a => a.id === customer.areaId)?.name || "Not set"} />
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-4">
              <h4 className="text-white font-semibold mb-2">Recent Invoices</h4>
              {invoices.length === 0 ? <p className="text-gray-500">No invoices found.</p> : (
                <div className="divide-y divide-white/5 bg-white/5 rounded-xl border border-white/10">
                  {invoices.slice(0, 5).map(inv => (
                    <div key={inv.id} className="p-4 flex justify-between items-center text-sm">
                      <div><span className="text-white font-medium">INV-{inv.id}</span> <span className="text-gray-400 text-xs ml-2">৳{inv.amount}</span></div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${inv.status === "paid" ? "text-neon-green bg-neon-green/10" : "text-red-400 bg-red-500/10"}`}>{inv.status || "unpaid"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
             <div className="flex justify-center items-center py-12 text-gray-500">
               <Activity className="mr-2" /> No recent activity logs.
             </div>
          )}

          {activeTab === "ledger" && (
            <div className="space-y-4">
              <h4 className="text-white font-semibold mb-2">Payment Ledger</h4>
              {payments.length === 0 ? <p className="text-gray-500">No payments found.</p> : (
                <div className="divide-y divide-white/5 bg-white/5 rounded-xl border border-white/10">
                  {payments.slice(0, 5).map(p => (
                    <div key={p.id} className="p-4 flex justify-between items-center text-sm">
                      <div><span className="text-white font-medium">৳{p.amount}</span> <span className="text-gray-400 text-xs ml-2">({p.method || "Cash"})</span></div>
                      <span className="text-gray-400 text-xs">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4th Image - Advanced Recharge Popup Modal */}
      <AnimatePresence>
        {rechargeCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap size={18} className="text-neon-green" /> রিচার্জ করুন
                </h3>
                <button 
                  onClick={() => setRechargeCustomer(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRechargeSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Customer Details Table Info */}
                <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-900/60 text-xs">
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="p-2.5 font-bold text-gray-400">আইডি (ID)</td>
                        <td className="p-2.5 text-white font-mono">{rechargeCustomer.id}</td>
                        <td className="p-2.5 font-bold text-gray-400">পিপিইওই (PPPoE)</td>
                        <td className="p-2.5 text-white font-mono">{rechargeCustomer.pppoeUsername || "N/A"}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-gray-400">নাম (Name)</td>
                        <td className="p-2.5 text-white font-semibold truncate max-w-[120px]">{rechargeCustomer.name}</td>
                        <td className="p-2.5 font-bold text-gray-400">মোবাইল (Mobile)</td>
                        <td className="p-2.5 text-white font-mono">{rechargeCustomer.phone}</td>
                      </tr>
                      <tr className="border-t border-white/5">
                        <td className="p-2.5 font-bold text-gray-400">মাসিক (Monthly)</td>
                        <td className="p-2.5 text-neon-blue font-bold">৳{rechargeCustomer.package?.price || "0"}</td>
                        <td className="p-2.5 font-bold text-gray-400">ব্যালেন্স (Balance)</td>
                        <td className="p-2.5 text-neon-green font-bold">৳{rechargeCustomer.walletBalance || "0"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Package Change Option */}
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/3 border border-white/8">
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-purple-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">প্যাকেজ পরিবর্তন (Package Change)</label>
                    <select
                      value={selectedNewPackageId}
                      onChange={(e) => setSelectedNewPackageId(e.target.value)}
                      className="w-full glass-input px-2.5 py-1.5 bg-slate-800 text-xs text-white"
                    >
                      <option value="" className="bg-slate-800">— বর্তমান প্যাকেজ রাখুন ({rechargeCustomer?.package?.name || "N/A"} - ৳{rechargeCustomer?.package?.price || "0"}) —</option>
                      {packagesList
                        .filter((p: any) => String(p.id) !== String(rechargeCustomer?.packageId))
                        .map((p: any) => (
                          <option key={p.id} value={p.id} className="bg-slate-800">
                            {p.name} — {p.speed} — ৳{p.price}
                          </option>
                        ))}
                    </select>
                  </div>
                  {selectedNewPackageId && (
                    <button
                      type="button"
                      onClick={() => setSelectedNewPackageId("")}
                      className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">বিল টাইপ *</label>
                    <select 
                      value={billType} 
                      onChange={(e) => setBillType(e.target.value as any)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white"
                    >
                      <option value="bill" className="bg-slate-800">বিল</option>
                      <option value="advance" className="bg-slate-800">অগ্রিম</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">বিলিং টাইপ *</label>
                    <select 
                      value={billingType} 
                      onChange={(e) => setBillingType(e.target.value as any)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white"
                    >
                      <option value="monthly" className="bg-slate-800">মাসিক</option>
                      <option value="daily" className="bg-slate-800">দৈনিক</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">বিল (Calculated Bill)</label>
                    <input 
                      type="text"
                      value={displayCalculated} 
                      onChange={(e) => setOverrideCalculated(e.target.value)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">ডিসকাউন্ট (Discount)</label>
                    <input 
                      type="text" 
                      value={discount} 
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">বকেয়া (Due Amount)</label>
                    <input 
                      type="text"
                      value={displayDue} 
                      onChange={(e) => {
                        setOverrideDue(e.target.value);
                        setOverridePaid("");
                      }}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">মাধ্যম (Method) *</label>
                    <select 
                      value={rechargeMethod} 
                      onChange={(e) => setRechargeMethod(e.target.value)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white"
                    >
                      <option value="হ্যান্ড ক্যাশ" className="bg-slate-800">হ্যান্ড ক্যাশ</option>
                      <option value="বিকাশ" className="bg-slate-800">বিকাশ</option>
                      <option value="নাগাদ" className="bg-slate-800">নাগাদ</option>
                    </select>
                  </div>
                </div>


                {/* Date Fields (Always visible now) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">রিচার্জ শুরুর তারিখ (Base Date)</label>
                    <input 
                      type="date"
                      value={customBaseDate}
                      onChange={(e) => {
                        const newBase = e.target.value;
                        setCustomBaseDate(newBase);
                        
                        // Recalculate expiry date automatically
                        if (newBase) {
                          const expDateObj = new Date(newBase);
                          if (billingType === "monthly") {
                            expDateObj.setMonth(expDateObj.getMonth() + 1);
                          } else {
                            expDateObj.setDate(expDateObj.getDate() + (parseInt(rechargeDays) || 1));
                          }
                          const yyyy = expDateObj.getFullYear();
                          const mm = String(expDateObj.getMonth() + 1).padStart(2, '0');
                          const dd = String(expDateObj.getDate()).padStart(2, '0');
                          let hh = "23";
                          let min = "59";
                          if (rechargeCustomer?.expireDate) {
                            const origExp = new Date(rechargeCustomer.expireDate);
                            if (!isNaN(origExp.getTime())) {
                              hh = String(origExp.getHours()).padStart(2, '0');
                              min = String(origExp.getMinutes()).padStart(2, '0');
                            }
                          }
                          setCustomExpireDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
                        }
                      }}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">মেয়াদ শেষ হওয়ার তারিখ (Expiry Date)</label>
                    <input 
                      type="datetime-local"
                      value={customExpireDate}
                      onChange={(e) => setCustomExpireDate(e.target.value)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
                    />
                  </div>
                </div>

                {billingType === "daily" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      দিন সংখ্যা (Number of Days) 
                      <span className="text-neon-blue ml-2 font-normal">
                        (রেট: ৳{Math.round((parseFloat(selectedNewPkg?.price || rechargeCustomer?.package?.price || "0") / 30) * 100) / 100} / দিন)
                      </span>
                    </label>
                    <input 
                      type="text" 
                      value={rechargeDays} 
                      onChange={(e) => {
                        const daysVal = e.target.value;
                        setRechargeDays(daysVal);
                        
                        // Dynamically update customExpireDate based on number of days from baseDate
                        if (customBaseDate) {
                          const base = new Date(customBaseDate);
                          const numDays = parseInt(daysVal) || 0;
                          base.setDate(base.getDate() + numDays);
                          const yyyy = base.getFullYear();
                          const mm = String(base.getMonth() + 1).padStart(2, '0');
                          const dd = String(base.getDate()).padStart(2, '0');
                          let hh = "23";
                          let min = "59";
                          if (rechargeCustomer?.expireDate) {
                            const origExp = new Date(rechargeCustomer.expireDate);
                            if (!isNaN(origExp.getTime())) {
                              hh = String(origExp.getHours()).padStart(2, '0');
                              min = String(origExp.getMinutes()).padStart(2, '0');
                            }
                          }
                          setCustomExpireDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
                        }
                      }}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white border border-neon-blue/30" 
                      placeholder="e.g. 1"
                    />
                  </div>
                )}

                {/* Total Bill Summary Line */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-neon-blue/5 border border-neon-blue/20 text-xs font-semibold">
                  <span className="text-gray-400">বিল: <span className="text-white font-bold">৳{displayCalculated}</span></span>
                  {parseFloat(discount) > 0 && (
                    <span className="text-gray-400">ছাড়: <span className="text-amber-400 font-bold">-৳{discount}</span></span>
                  )}
                  {parseFloat(displayDue) > 0 && (
                    <span className="text-gray-400">বকেয়া: <span className="text-rose-400 font-bold">৳{displayDue}</span></span>
                  )}
                  {parseFloat(displayDue) < 0 && (
                    <span className="text-gray-400">অ্যাডভান্স: <span className="text-emerald-400 font-bold">৳{Math.abs(parseFloat(displayDue))}</span></span>
                  )}
                  <span className="text-gray-300">পরিশোধিত: <span className="text-neon-green font-bold text-sm">৳{displayPaid}</span></span>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="renewBack" 
                      checked={renewBack} 
                      onChange={(e) => setRenewBack(e.target.checked)}
                      className="rounded bg-slate-800 border-white/10 text-neon-blue focus:ring-0" 
                    />
                    <label htmlFor="renewBack" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                      মেয়াদ থেকে রিনিউ (Renew Back)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="showNoteDate" 
                      checked={showNoteDate} 
                      onChange={(e) => setShowNoteDate(e.target.checked)}
                      className="rounded bg-slate-800 border-white/10 text-neon-blue focus:ring-0" 
                    />
                    <label htmlFor="showNoteDate" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                      নোট (Note)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="modalAutoRenew" 
                      checked={modalAutoRenew} 
                      onChange={(e) => setModalAutoRenew(e.target.checked)}
                      className="rounded bg-slate-800 border-white/10 text-neon-blue focus:ring-0" 
                    />
                    <label htmlFor="modalAutoRenew" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                      অটো রিনিউ (Auto Renew)
                    </label>
                  </div>
                </div>

                {showNoteDate && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">নোট (Note)</label>
                      <textarea 
                        value={rechargeNote} 
                        onChange={(e) => setRechargeNote(e.target.value)}
                        placeholder="পেমেন্ট বা রিচার্জ নোট লিখুন..." 
                        className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white h-16 resize-none" 
                      />
                    </div>
                  </motion.div>
                )}

                {/* Submit Action */}
                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setRechargeCustomer(null)}
                    className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/10 transition-colors"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="submit"
                    disabled={rechargeLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neon-green/20 text-neon-green border border-neon-green/50 text-xs font-bold hover:bg-neon-green/30 transition-colors disabled:opacity-50"
                  >
                    {rechargeLoading ? "লোডিং..." : <><Save size={14} /> পে (Pay)</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
{/* Recharge Success Popup Modal */}
      <AnimatePresence>
        {rechargeSuccessMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e293b] border border-[#22c55e]/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-white">রিচার্জ সফল হয়েছে!</h3>
              <p className="text-gray-300 text-xs">{rechargeSuccessMessage}</p>
              <button
                onClick={() => {
                  setRechargeSuccessMessage(null);
                  window.location.reload();
                }}
                className="w-full py-2 bg-neon-green/20 text-neon-green border border-neon-green/40 font-bold text-xs rounded-xl hover:bg-neon-green/30 transition-all"
              >
                ঠিক আছে (OK)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

{/* Tool Modals (Ping/TraceRoute) */}
      <AnimatePresence>
        {(showPingModal || showTraceModal) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Terminal size={18} className="text-neon-blue" />
                  {showPingModal ? "Ping Report" : "IP Trace Route"}
                </h3>
                <button onClick={() => { setShowPingModal(false); setShowTraceModal(false); setToolOutput(""); }} className="text-gray-400 hover:text-white">
                  <XCircle size={20} />
                </button>
              </div>
              <div className="p-4 bg-black/40 min-h-[300px]">
                <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{toolOutput}</pre>
                {!toolOutput.includes("complete") && !toolOutput.includes("statistics") && (
                  <div className="flex items-center gap-2 text-gray-500 text-xs mt-4">
                    <Loader2 size={12} className="animate-spin" /> Running diagnostics...
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-white/5 rounded-xl flex items-start gap-3 border border-white/5">
      <div className="text-neon-blue mt-1">{icon}</div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  );
}
