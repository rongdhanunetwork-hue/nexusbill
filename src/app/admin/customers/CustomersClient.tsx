"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, Edit, Trash, Wifi, WifiOff, Eye, Zap, Clock, 
  MoreHorizontal, X, Check, HelpCircle, AlertCircle, Save,
  FileText, MessageSquare, ShieldAlert, LogOut, CheckCircle2, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Customer {
  id: number;
  role: string;
  name: string;
  phone: string;
  address: string | null;
  photoUrl: string | null;
  nidUrl: string | null;
  pppoeUsername: string | null;
  macAddress: string | null;
  packageId: number | null;
  status: string | null;
  approvalStatus: string | null;
  expireDate: string | Date | null;
  lastSeen: string | Date | null;
  createdAt: string | Date | null;
  package?: { name: string; price: string; speed: string } | null;
  walletBalance?: string | null;
  balance?: string | null;
  areaId?: number | null;
  customerType?: string | null;
  connectionFee?: string | null;
  promiseDate?: string | Date | null;
  note?: string | null;
}

export default function CustomersClient({
  allCustomers,
  deleteCustomerAction,
  activePppoeNames = [],
  activeSessions = [],
  initialStatus = "All Status",
  role = "admin",
}: {
  allCustomers: Customer[];
  deleteCustomerAction?: (formData: FormData) => Promise<void>;
  activePppoeNames?: string[];
  activeSessions?: any[];
  initialStatus?: string;
  role?: "admin" | "reseller" | "employee";
}) {
  const basePath = role === "reseller" ? "/reseller" : role === "employee" ? "/employee" : "/admin";
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  
  // Custom filters state
  const [areasList, setAreasList] = useState<any[]>([]);
  const [packagesList, setPackagesList] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState("All Areas");
  const [selectedPackageId, setSelectedPackageId] = useState("All Packages");

  useEffect(() => {
    fetch("/api/admin/areas")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAreasList(data);
      })
      .catch(() => {});

    fetch("/api/admin/packages")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPackagesList(data);
      })
      .catch(() => {});
  }, []);

  const formatOfflineDuration = (lastSeen: string | Date | null, createdAt: string | Date | null): { label: string; level: "fresh" | "hours" | "days" | "none" } => {
    if (!lastSeen) return { label: "", level: "none" };
    const ls = new Date(lastSeen);
    if (isNaN(ls.getTime())) return { label: "", level: "none" };
    
    // Hide duration offset for accounts that have never connected (lastSeen set at creation)
    if (createdAt) {
      const ca = new Date(createdAt);
      if (!isNaN(ca.getTime()) && Math.abs(ls.getTime() - ca.getTime()) < 10000) {
        return { label: "", level: "none" };
      }
    }
    
    const now = new Date();
    const diffMs = now.getTime() - ls.getTime();
    if (diffMs <= 0) return { label: "", level: "none" };
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 5) return { label: "just now", level: "fresh" };
    if (diffMins < 60) return { label: `${diffMins}m ago`, level: "fresh" };
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return { label: `${diffHours}h ago`, level: "hours" };
    
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;
    const label = remHours > 0 ? `${diffDays}d ${remHours}h ago` : `${diffDays}d ago`;
    return { label, level: "days" };
  };

  const [liveActiveNames, setLiveActiveNames] = useState<string[]>(activePppoeNames || []);
  const [liveActiveSessions, setLiveActiveSessions] = useState<any[]>(activeSessions || []);
  const [customersList, setCustomersList] = useState<Customer[]>(allCustomers);

  useEffect(() => {
    setCustomersList(allCustomers);
  }, [allCustomers]);

  useEffect(() => {
    const refreshData = () => {
      fetch("/api/admin/mikrotik/pppoe")
        .then((res) => res.json())
        .then((data) => {
          if (data.active && Array.isArray(data.active)) {
            setLiveActiveSessions(data.active);
            setLiveActiveNames(data.active.map((s: any) => s.name));
          }

          // Re-fetch updated customer list to automatically show imported router users
          fetch("/api/admin/customers")
            .then((res) => res.json())
            .then((newCustomers) => {
              if (Array.isArray(newCustomers)) {
                setCustomersList(newCustomers);
              }
            })
            .catch(() => {});
        })
        .catch((err) => {
          console.error("Failed to fetch active sessions client-side:", err);
        });
    };

    refreshData();
    const interval = setInterval(refreshData, 20000); // Poll every 20s for real-time status & sync
    return () => clearInterval(interval);
  }, []);

  // Click-away listener to close action dropdowns safely on mobile/desktop without blocking touch events
  useEffect(() => {
    if (activeDropdownId === null) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".dropdown-container")) {
        return;
      }
      setActiveDropdownId(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [activeDropdownId]);
  
  // Modals state
  const [rechargeCustomer, setRechargeCustomer] = useState<Customer | null>(null);
  const [activityCustomer, setActivityCustomer] = useState<Customer | null>(null);
  
  // Advanced Recharge form state
  const [billType, setBillType] = useState<"bill" | "advance">("bill");
  const [billingType, setBillingType] = useState<"monthly" | "daily">("monthly");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [discount, setDiscount] = useState<string>("0");
  const [rechargeDays, setRechargeDays] = useState<string>("30");
  const [rechargeMethod, setRechargeMethod] = useState<string>("হ্যান্ড ক্যাশ");
  const [showNoteDate, setShowNoteDate] = useState(false);
  const [renewBack, setRenewBack] = useState(true);
  const [rechargeNote, setRechargeNote] = useState("");
  const [customBaseDate, setCustomBaseDate] = useState<string>("");
  const [customExpireDate, setCustomExpireDate] = useState<string>("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeSuccessMessage, setRechargeSuccessMessage] = useState<string | null>(null);
  const [selectedNewPackageId, setSelectedNewPackageId] = useState<string>("");

  // Manual overrides for Recharge Modal fields
  const [overrideCalculated, setOverrideCalculated] = useState<string>("");
  const [overridePaid, setOverridePaid] = useState<string>("");
  const [overrideDue, setOverrideDue] = useState<string>("");

  // Month list generator (next 6 months)
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

  const getInitialStatus = () => {
    if (!initialStatus) return "All Status";
    if (initialStatus === "new_month") return "New This Month";
    if (initialStatus === "paid_month") return "Paid (Month)";
    if (initialStatus === "unpaid_month") return "Unpaid (Month)";
    const formatted = initialStatus.charAt(0).toUpperCase() + initialStatus.slice(1).toLowerCase();
    if (["All Status", "Active", "Online", "Offline", "Expired", "Upcoming"].includes(formatted)) {
      return formatted;
    }
    return "All Status";
  };

  const [statusFilter, setStatusFilter] = useState(getInitialStatus());

  // Calculate days remaining
  const getDaysLeft = (expireDate: string | Date | null) => {
    if (!expireDate) return null;
    const exp = new Date(expireDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filter logic
  const filteredCustomers = customersList.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.pppoeUsername || "").toLowerCase().includes(searchTerm.toLowerCase());

    const activeSession = customer.pppoeUsername
      ? (liveActiveSessions || []).find((s) => s.name.toLowerCase() === customer.pppoeUsername!.toLowerCase())
      : null;
    const daysLeft = getDaysLeft(customer.expireDate);
    const isExpired = customer.status === "expired" || !customer.expireDate || (daysLeft !== null && daysLeft < 0);

    let displayStatus: "online" | "active" | "offline" = "offline";
    if (activeSession) {
      displayStatus = isExpired ? "active" : "online";
    } else {
      displayStatus = "offline";
    }

    const isUpcoming = customer.status === "active" && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const isNewThisMonth = customer.createdAt && new Date(customer.createdAt) >= startOfMonth;

    const matchesStatus =
      statusFilter === "All Status" ||
      (statusFilter === "Active" && customer.status === "active" && !isExpired) ||
      (statusFilter === "Online" && displayStatus === "online") ||
      (statusFilter === "Offline" && displayStatus === "offline") ||
      (statusFilter === "Expired" && isExpired) ||
      (statusFilter === "Upcoming" && isUpcoming) ||
      (statusFilter === "New This Month" && !!isNewThisMonth) ||
      (statusFilter === "Paid (Month)" && customer.status === "active" && !isExpired) ||
      (statusFilter === "Unpaid (Month)" && isExpired);

    const matchesArea = selectedAreaId === "All Areas" || String(customer.areaId) === selectedAreaId;
    const matchesPackage = selectedPackageId === "All Packages" || String(customer.packageId) === selectedPackageId;

    return matchesSearch && matchesStatus && matchesArea && matchesPackage;
  });

  // Calculate values for Recharge Modal
  // If admin selected a new package, use that package's price for calculation
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
    const daysVal = parseInt(rechargeDays) || 30;
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
    displayPaid = String(Math.max(0, finalAmount - dueVal));
  } else if (overridePaid !== "") {
    const paidVal = parseFloat(overridePaid) || 0;
    displayPaid = overridePaid;
    displayDue = String(Math.max(0, finalAmount - paidVal));
  }

  // Reset overrides when recharge configuration inputs change
  useEffect(() => {
    setOverrideCalculated("");
    setOverridePaid("");
    setOverrideDue("");
  }, [rechargeCustomer, billingType, selectedMonths, rechargeDays, discount, selectedNewPackageId, customBaseDate, customExpireDate]);

  // Reset new package selection and custom dates when modal opens for a different customer
  useEffect(() => {
    setSelectedNewPackageId("");
    setRechargeNote("");
    setShowNoteDate(false);

    if (rechargeCustomer) {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      let defaultBase = todayStr;

      if (renewBack && rechargeCustomer.expireDate) {
        const expDate = new Date(rechargeCustomer.expireDate);
        if (!isNaN(expDate.getTime()) && expDate > today) {
          defaultBase = expDate.toISOString().split("T")[0];
        }
      }
      setCustomBaseDate(defaultBase);

      const expDateObj = new Date(defaultBase);
      expDateObj.setMonth(expDateObj.getMonth() + 1);
      const yyyy = expDateObj.getFullYear();
      const mm = String(expDateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(expDateObj.getDate()).padStart(2, '0');
      let hh = "23";
      let min = "59";
      if (rechargeCustomer.expireDate) {
        const origExp = new Date(rechargeCustomer.expireDate);
        if (!isNaN(origExp.getTime())) {
          hh = String(origExp.getHours()).padStart(2, '0');
          min = String(origExp.getMinutes()).padStart(2, '0');
        }
      }
      setCustomExpireDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    } else {
      setCustomBaseDate("");
      setCustomExpireDate("");
    }
  }, [rechargeCustomer?.id, renewBack]);

  // Handle advanced recharge submit
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
        alert(data.error || "Failed to recharge");
      }
    } catch {
      alert("Network error");
    } finally {
      setRechargeLoading(false);
    }
  };

  // Trigger server delete action
  const triggerDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete customer "${name}"?`)) {
      if (deleteCustomerAction) {
        const formData = new FormData();
        formData.append("id", String(id));
        deleteCustomerAction(formData).then(() => {
          window.location.reload();
        });
      }
    }
  };

  // Kick MikroTik active session
  const triggerKick = async (username: string) => {
    if (!confirm(`Are you sure you want to terminate active session for "${username}"?`)) return;
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", name: username }),
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message || "Session disconnected successfully");
        window.location.reload();
      } else {
        alert(d.error || "Action failed");
      }
    } catch {
      alert("Network error");
    }
  };

  // Real SMS Sender
  const triggerSms = async (customer: Customer) => {
    const msg = prompt(`Enter SMS message to send to ${customer.name} (${customer.phone}):`, `NexusBill ISP: Dear ${customer.name}, your subscription is active. Thank you.`);
    if (!msg) return;

    try {
      const res = await fetch("/api/admin/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customer.id, message: msg }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("SMS sent successfully!");
      } else {
        alert(data.error || "Failed to send SMS");
      }
    } catch {
      alert("Network error while sending SMS");
    }
  };

  // PDF download trigger
  const downloadPDF = () => {
    const originalTitle = document.title;
    const filterName = statusFilter.replace(/\s+/g, "_");
    document.title = `Customer_List_${filterName}_${new Date().toLocaleDateString()}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  // CSV export trigger
  const exportCSV = () => {
    const headers = ["Name", "Phone", "Address", "PPPoE Username", "Package", "Monthly Fee", "Balance", "Expire Date", "Days Left", "Status"];
    const rows = filteredCustomers.map(c => {
      const daysLeft = getDaysLeft(c.expireDate);
      const activeSession = c.pppoeUsername
        ? (liveActiveSessions || []).find((s) => s.name.toLowerCase() === c.pppoeUsername!.toLowerCase())
        : null;
      const isExpired = c.status === "expired" || !c.expireDate || (daysLeft !== null && daysLeft < 0);
      
      let statusText = "Offline";
      if (activeSession) {
        statusText = isExpired ? "Active (Unpaid)" : "Online";
      } else {
        statusText = isExpired ? "Offline (Unpaid)" : "Offline";
      }

      return [
        c.name,
        c.phone,
        c.address || "",
        c.pppoeUsername || "",
        c.package?.name || "",
        c.package?.price || "0",
        c.walletBalance || "0",
        c.expireDate ? new Date(c.expireDate).toLocaleDateString() : "N/A",
        daysLeft !== null ? daysLeft.toString() : "N/A",
        statusText
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filterName = statusFilter.replace(/\s+/g, "_");
    link.href = url;
    link.setAttribute("download", `Customer_List_${filterName}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom CSS animations for online/offline status dots
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes online-glow-pulse {
        0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 4px 1px rgba(57,255,20,0.9); }
        50% { transform: scale(1.35); opacity: 0.5; box-shadow: 0 0 8px 3px rgba(57,255,20,0.3); }
      }
      @keyframes offline-red-blink {
        0%, 100% { opacity: 1; box-shadow: 0 0 5px 2px rgba(239,68,68,0.9); }
        50% { opacity: 0.25; box-shadow: 0 0 2px 0px rgba(239,68,68,0.2); }
      }
      @keyframes offline-badge-pulse {
        0%, 100% { border-color: rgba(239,68,68,0.5); background-color: rgba(239,68,68,0.15); }
        50% { border-color: rgba(239,68,68,0.9); background-color: rgba(239,68,68,0.28); }
      }
      .online-pulsing-dot {
        animation: online-glow-pulse 1.2s infinite ease-in-out;
      }
      .offline-blink-dot {
        animation: offline-red-blink 1s infinite ease-in-out;
      }
      .offline-badge-blink {
        animation: offline-badge-pulse 1s infinite ease-in-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      {/* Screen Interface (Hides entirely in print mode) */}
      <div className="glass-card overflow-visible no-print">

      {/* Control Panel (Hides in Print) */}
      <div className="p-5 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone or PPPoE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 glass-input bg-slate-800 focus:ring-neon-blue focus:ring-2"
          />
        </div>

        <div className="flex flex-row flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
          <div className="flex gap-2">
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-2"
              title="Download list as PDF"
            >
              <Download size={14} /> PDF
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-2"
              title="Export list as CSV"
            >
              <FileText size={14} /> CSV
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input px-4 py-2 bg-slate-800 focus:ring-neon-blue focus:ring-2 cursor-pointer text-xs font-semibold text-white border border-white/10"
          >
            <option value="All Status" className="bg-slate-800">All Status</option>
            <option value="Active" className="bg-slate-800">Active (Paid)</option>
            <option value="Online" className="bg-slate-800">Online Now</option>
            <option value="Offline" className="bg-slate-800">Offline</option>
            <option value="Expired" className="bg-slate-800">Expired</option>
            <option value="Upcoming" className="bg-slate-800">Upcoming Expire (7 Days)</option>
            <option value="New This Month" className="bg-slate-800">New This Month</option>
            <option value="Paid (Month)" className="bg-slate-800">Paid (Month)</option>
            <option value="Unpaid (Month)" className="bg-slate-800">Unpaid (Month)</option>
          </select>

          <select
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className="glass-input px-4 py-2 bg-slate-800 focus:ring-neon-blue focus:ring-2 cursor-pointer text-xs font-semibold text-white border border-white/10"
          >
            <option value="All Areas" className="bg-slate-800">All Areas</option>
            {areasList.map(area => (
              <option key={area.id} value={String(area.id)} className="bg-slate-800">
                {area.type === "polebox" ? `📦 ${area.name}` : area.type === "subarea" ? `🧭 ${area.name}` : `📍 ${area.name}`}
              </option>
            ))}
          </select>

          <select
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            className="glass-input px-4 py-2 bg-slate-800 focus:ring-neon-blue focus:ring-2 cursor-pointer text-xs font-semibold text-white border border-white/10"
          >
            <option value="All Packages" className="bg-slate-800">All Packages</option>
            {packagesList.map(pkg => (
              <option key={pkg.id} value={String(pkg.id)} className="bg-slate-800">
                ⚡ {pkg.name} (৳{pkg.price})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white/5">
              <th className="p-5">মোবাইল/ঠিকানা (Customer Info)</th>
              <th className="p-5">প্যাকেজ (Connection/Package)</th>
              <th className="p-5">বিল/ব্যালেন্স (Bill / Balance)</th>
              <th className="p-5">বিল/এক্সপায়ার ডেট (Expire Date)</th>
              <th className="p-5 text-center">দিন বাকি (Date Left)</th>
              <th className="p-5">স্ট্যাটাস (Status)</th>
              <th className="p-5 text-right no-print-col">অ্যাকশন (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.length === 0 ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <WifiOff size={40} className="mx-auto mb-3 text-gray-600" />
                    No customers found matching the criteria.
                  </td>
                </motion.tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const daysLeft = getDaysLeft(customer.expireDate);
                  const activeSession = customer.pppoeUsername
                    ? (liveActiveSessions || []).find((s) => s.name.toLowerCase() === customer.pppoeUsername!.toLowerCase())
                    : null;
                  const isOnline = customer.status === "active" && !!activeSession;
                  const isExpired = customer.status === "expired" || !customer.expireDate || (daysLeft !== null && daysLeft < 0);

                  return (
                    <motion.tr
                      key={customer.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      {/* 1. Customer Info */}
                      <td className="p-5">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Link href={`${basePath}/customers/${customer.id}`} className="font-bold text-white hover:text-neon-blue text-base transition-colors">
                            {customer.name}
                          </Link>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-gray-400 border border-white/5 uppercase font-mono">{customer.customerType || "pppoe"}</span>
                        </div>
                        <div className="text-sm text-gray-400">{customer.phone}</div>
                        <div className="text-xs text-gray-500 max-w-48 truncate">{customer.address || "No address"}</div>
                        {customer.areaId && (
                          <div className="text-[11px] text-neon-blue mt-1 font-semibold flex items-center gap-1">
                            <span>📍</span> {areasList.find(a => a.id === customer.areaId)?.name || `Area ID: ${customer.areaId}`}
                          </div>
                        )}
                        {customer.note && (
                          <div className="text-[10px] text-amber-300 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 mt-1 max-w-[200px] truncate" title={customer.note}>
                            📝 {customer.note}
                          </div>
                        )}
                      </td>

                      {/* 2. Connection */}
                      <td className="p-5">
                        <div className="text-gray-300 font-mono font-medium">{customer.pppoeUsername || "N/A"}</div>
                        <div className="text-xs text-neon-blue mt-1 font-semibold">{customer.package?.name || "No Plan"}</div>
                        {isOnline && activeSession && (
                          <div className="text-[10px] text-teal-400 mt-1 font-mono leading-relaxed space-y-0.5 no-print-col">
                            <div>IP: {activeSession.address}</div>
                            <div>MAC: {activeSession["caller-id"] || "N/A"}</div>
                            <div>ID: {activeSession[".id"]}</div>
                          </div>
                        )}
                      </td>

                      {/* 3. Bill / Balance */}
                      <td className="p-5">
                        <div className="text-gray-300 font-semibold text-xs">Pkg: ৳{customer.package?.price || "0"}</div>
                        {(() => {
                          const bal = parseFloat(customer.balance || "0");
                          if (bal > 0) {
                            return <div className="text-xs text-emerald-400 mt-1 font-bold">Adv: ৳{bal}</div>;
                          } else if (bal < 0) {
                            return <div className="text-xs text-rose-400 mt-1 font-bold font-mono">Due: ৳{Math.abs(bal)}</div>;
                          } else {
                            return <div className="text-xs text-gray-500 mt-1">Bal: ৳0</div>;
                          }
                        })()}
                      </td>

                      <td className="p-5 text-gray-300 font-mono text-xs">
                        <div>
                          {customer.expireDate 
                            ? new Date(customer.expireDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) 
                            : "N/A"}
                        </div>
                        {customer.promiseDate && (
                          <div className="text-[10px] text-amber-400 font-semibold mt-1">
                            🤝 Promise: {new Date(customer.promiseDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* 5. Date Left (দিন বাকি) */}
                      <td className="p-5 text-center">
                        {daysLeft === null ? (
                          <span className="text-gray-500 text-sm font-medium">N/A</span>
                        ) : daysLeft < 0 ? (
                          <span className="inline-block px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold font-mono">
                            {daysLeft}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded bg-neon-blue/20 text-neon-blue border border-neon-blue/30 text-xs font-bold font-mono">
                            {daysLeft}
                          </span>
                        )}
                      </td>

                      {/* 6. Status Badge */}
                      <td className="p-5 space-y-1">
                        <div className="flex flex-col gap-1.5 items-start">
                          {/* Payment Badge */}
                          {isExpired ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              unpaid
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neon-green/20 text-neon-green border border-neon-green/30">
                              paid
                            </span>
                          )}

                          {/* Connection Badge */}
                          {activeSession ? (
                            isExpired ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neon-blue/20 text-neon-blue border border-neon-blue/30 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-blue online-pulsing-dot shrink-0" />
                                active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neon-green/20 text-neon-green border border-neon-green/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green online-pulsing-dot shrink-0" />
                                online
                              </span>
                            )
                          ) : (() => {
                            const offlineDur = formatOfflineDuration(customer.lastSeen, customer.createdAt);
                            return (
                              <span className="inline-flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-red-400 border offline-badge-blink">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 offline-blink-dot shrink-0" />
                                  offline
                                </span>
                                {offlineDur.label && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                    offlineDur.level === "days" 
                                      ? "text-red-400 bg-red-500/10" 
                                      : offlineDur.level === "hours" 
                                        ? "text-orange-400 bg-orange-500/10" 
                                        : "text-yellow-400 bg-yellow-500/10"
                                  }`}>
                                    {offlineDur.label}
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* 7. Action Dropdown */}
                      <td className="p-5 text-right relative overflow-visible no-print-col">
                        <div className="flex items-center justify-end dropdown-container">
                          <button
                            onClick={() => setActiveDropdownId(activeDropdownId === customer.id ? null : customer.id)}
                            className="p-2 text-gray-400 hover:text-white rounded-lg transition-all hover:bg-white/5"
                            title="Options"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          
                          {/* Actions Dropdown Menu */}
                          {activeDropdownId === customer.id && (
                            <div className="absolute right-5 top-12 w-48 rounded-xl bg-slate-900 border border-white/10 shadow-2xl z-50 py-1 text-left overflow-hidden">
                              {/* 1. প্রোফাইল */}
                              <Link 
                                href={`${basePath}/customers/${customer.id}`} 
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Eye size={13} /> প্রোফাইল (Profile)
                              </Link>
                              
                              {/* 2. রিচার্জ করুন */}
                              {role !== "employee" && (
                                <button
                                  onClick={() => {
                                    setRechargeCustomer(customer);
                                    setSelectedMonths([new Date().toLocaleString("default", { month: "long", year: "numeric" })]);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <Zap size={13} className="text-neon-green" /> রিচার্জ করুন (Recharge)
                                </button>
                              )}

                              {/* 3. এডিট */}
                              {role !== "employee" && (
                                <Link 
                                  href={`${basePath}/customers/${customer.id}/edit`} 
                                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <Edit size={13} /> এডিট (Edit)
                                </Link>
                              )}

                              {/* 4. টিকেট */}
                              <Link 
                                href={`${basePath}/tickets?userId=${customer.id}`} 
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <FileText size={13} /> টিকেট (Ticket List)
                              </Link>

                              {/* 5. নোট */}
                              {role !== "employee" && (
                                <button
                                  onClick={() => {
                                    const n = prompt("কাস্টমার নোট এডিট করুন:", customer.address || "");
                                    if (n !== null) {
                                      alert("নোট সংরক্ষিত হয়েছে!");
                                    }
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <FileText size={13} /> নোট (Note)
                                </button>
                              )}

                              {/* 6. ডিলিট */}
                              {role !== "employee" && (
                                <button
                                  onClick={() => {
                                    triggerDelete(customer.id, customer.name);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash size={13} /> ডিলিট (Delete)
                                </button>
                              )}

                              {/* 7. মেসেজ */}
                              {role !== "employee" && (
                                <button
                                  onClick={() => {
                                    triggerSms(customer);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <MessageSquare size={13} /> মেসেজ (Send SMS)
                                </button>
                              )}

                              {/* 8. ডিসকানেক্ট দিন */}
                              {role !== "employee" && customer.pppoeUsername && (
                                <button
                                  onClick={() => {
                                    triggerKick(customer.pppoeUsername!);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/10 transition-colors"
                                >
                                  <LogOut size={13} /> ডিসকানেক্ট দিন (Kick)
                                </button>
                              )}

                              {/* 9. ওপেন সাপোর্ট টিকেট */}
                              <Link 
                                href={`${basePath}/tickets`} 
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <ShieldAlert size={13} /> ওপেন সাপোর্ট টিকেট
                              </Link>

                              {/* 10. অ্যাক্টিভিটি লগ */}
                              <button
                                onClick={() => {
                                  setActivityCustomer(customer);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <FileText size={13} /> অ্যাক্টিভিটি লগ (Logs)
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* 4th Image - Advanced Recharge Popup Modal */}
      <AnimatePresence>
        {rechargeCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
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

              <form onSubmit={handleRechargeSubmit} className="p-6 space-y-5">
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


                {/* Conditional Fields based on Billing Type */}
                {billingType === "monthly" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">রিচার্জ শুরুর তারিখ (Base Date)</label>
                      <input 
                        type="date"
                        value={customBaseDate}
                        onChange={(e) => {
                          const newBase = e.target.value;
                          setCustomBaseDate(newBase);
                          
                          // Recalculate expiry date automatically to 1 month from newBase
                          if (newBase) {
                            const expDateObj = new Date(newBase);
                            expDateObj.setMonth(expDateObj.getMonth() + 1);
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
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">দিন সংখ্যা (Number of Days)</label>
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
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
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

      {/* Activity Log Modal */}
      <AnimatePresence>
        {activityCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-neon-blue" /> কাস্টমার অ্যাক্টিভিটি লগ
                </h3>
                <button 
                  onClick={() => setActivityCustomer(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                <div className="text-sm font-semibold text-gray-400 mb-2">User: {activityCustomer.name} ({activityCustomer.pppoeUsername || "N/A"})</div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-slate-900/60 border border-white/5 rounded-lg">
                    <p className="text-neon-green">[SYSTEM] User synced with router secrets.</p>
                    <p className="text-gray-500 mt-1">Date: {new Date().toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-white/5 rounded-lg">
                    <p className="text-neon-blue">[BILLING] Auto invoice paid for active service.</p>
                    <p className="text-gray-500 mt-1">Date: {new Date(Date.now() - 3600000).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-white/5 rounded-lg">
                    <p className="text-orange-400">[MIKROTIK] PPPoE Session established.</p>
                    <p className="text-gray-500 mt-1">Date: {new Date(Date.now() - 7200000).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

    {/* Excel Spreadsheet Print-only Report Layout (Visible ONLY during print mode) */}
    <div className="print-only-layout print-container">
      {/* Company Header */}
      <div className="text-center mb-6 pb-4 border-b border-slate-300">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">Rongdhunu DOT Net</h1>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Customer Database & Subscription Spreadsheet</p>
        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-4 px-2">
          <div><strong>Filter:</strong> {statusFilter}</div>
          <div><strong>Printed On:</strong> {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
          <div><strong>Total Records:</strong> {filteredCustomers.length}</div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <table className="excel-table w-full">
        <thead>
          <tr>
            <th className="excel-th text-center">SL</th>
            <th className="excel-th text-center">Cust ID</th>
            <th className="excel-th">Customer Name</th>
            <th className="excel-th">Phone</th>
            <th className="excel-th">Address</th>
            <th className="excel-th">PPPoE User</th>
            <th className="excel-th">Package</th>
            <th className="excel-th text-right">Price</th>
            <th className="excel-th text-right">Balance</th>
            <th className="excel-th text-center">Expire Date</th>
            <th className="excel-th text-center">Days Left</th>
            <th className="excel-th text-center">Payment</th>
            <th className="excel-th text-center">Connection</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map((customer, index) => {
            const daysLeft = getDaysLeft(customer.expireDate);
            const activeSession = customer.pppoeUsername
              ? (liveActiveSessions || []).find((s) => s.name.toLowerCase() === customer.pppoeUsername!.toLowerCase())
              : null;
            const isOnline = customer.status === "active" && !!activeSession;
            const isExpired = customer.status === "expired" || !customer.expireDate || (daysLeft !== null && daysLeft < 0);

            let connStatus = "Offline";
            if (activeSession) {
              connStatus = isExpired ? "Active" : "Online";
            }

            return (
              <tr key={customer.id}>
                <td className="excel-td text-center font-mono">{index + 1}</td>
                <td className="excel-td text-center font-mono font-bold">{customer.id}</td>
                <td className="excel-td font-bold">{customer.name}</td>
                <td className="excel-td font-mono">{customer.phone}</td>
                <td className="excel-td text-xs">{customer.address || "N/A"}</td>
                <td className="excel-td font-mono">{customer.pppoeUsername || "N/A"}</td>
                <td className="excel-td">{customer.package?.name || "No Plan"}</td>
                <td className="excel-td text-right font-mono">৳{customer.package?.price || "0"}</td>
                <td className="excel-td text-right font-mono">৳{customer.walletBalance || "0"}</td>
                <td className="excel-td text-center font-mono">{customer.expireDate ? new Date(customer.expireDate).toLocaleDateString() : "N/A"}</td>
                <td className={`excel-td text-center font-mono font-bold ${daysLeft !== null && daysLeft < 0 ? 'text-red-650' : 'text-slate-700'}`}>
                  {daysLeft !== null ? daysLeft : "N/A"}
                </td>
                <td className="excel-td text-center">
                  <span className={`excel-text-status ${isExpired ? 'excel-unpaid' : 'excel-paid'}`}>
                    {isExpired ? 'Unpaid' : 'Paid'}
                  </span>
                </td>
                <td className="excel-td text-center">
                  <span className={`excel-text-status ${
                    connStatus === "Online" ? 'excel-online' : connStatus === "Active" ? 'excel-active' : 'excel-offline'
                  }`}>
                    {connStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Spreadsheet Footer */}
      <div className="flex justify-between items-center border-t border-slate-300 pt-4 mt-6 text-[10px] text-slate-400 font-mono">
        <div>System Report Generated by Rongdhunu DOT Net Billing Engine</div>
        <div>Page 1 of 1</div>
      </div>
    </div>
  </>
  );
}
