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
  createdAt: string | Date | null;
  package?: { name: string; price: string } | null;
  walletBalance?: string | null;
}

export default function CustomersClient({
  allCustomers,
  deleteCustomerAction,
  activePppoeNames = [],
  activeSessions = [],
  initialStatus = "All Status",
}: {
  allCustomers: Customer[];
  deleteCustomerAction: (formData: FormData) => Promise<void>;
  activePppoeNames?: string[];
  activeSessions?: any[];
  initialStatus?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

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
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeSuccessMessage, setRechargeSuccessMessage] = useState<string | null>(null);

  // Manual overrides for Recharge Modal fields
  const [overrideCalculated, setOverrideCalculated] = useState<string>("");
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

    const isOnline = customer.status === "active" && customer.pppoeUsername && liveActiveNames.includes(customer.pppoeUsername);
    const daysLeft = getDaysLeft(customer.expireDate);
    const isExpired = customer.status === "expired" || (daysLeft !== null && daysLeft < 0);
    const displayStatus = isExpired ? "expired" : (isOnline ? "online" : "offline");

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
      (statusFilter === "Expired" && displayStatus === "expired") ||
      (statusFilter === "Upcoming" && isUpcoming) ||
      (statusFilter === "New This Month" && !!isNewThisMonth);

    return matchesSearch && matchesStatus;
  });

  // Calculate values for Recharge Modal
  const monthlyPrice = rechargeCustomer ? parseFloat(rechargeCustomer.package?.price || "0") : 0;
  let calculatedAmount = 0;
  let durationVal = 1;

  if (billingType === "monthly") {
    durationVal = Math.max(1, selectedMonths.length);
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

  const displayDue = overrideDue !== "" ? overrideDue : String(finalAmount);

  // Reset overrides when recharge configuration inputs change
  useEffect(() => {
    setOverrideCalculated("");
    setOverrideDue("");
  }, [rechargeCustomer, billingType, selectedMonths, rechargeDays, discount]);

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
          amount: parseFloat(displayDue) || 0,
          billingType,
          duration: durationVal,
          method: rechargeMethod,
          discount: parseFloat(discount) || 0,
          note: showNoteDate ? rechargeNote : "",
          renewBack,
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
      const formData = new FormData();
      formData.append("id", String(id));
      deleteCustomerAction(formData).then(() => {
        window.location.reload();
      });
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

  // Mock SMS Sender
  const triggerSms = (customer: Customer) => {
    const msg = prompt(`Enter SMS message to send to ${customer.name} (${customer.phone}):`, `NexusBill ISP: Your subscription is expiring soon. Please recharge to avoid disconnection.`);
    if (msg) {
      alert(`Mock SMS sent to ${customer.phone} successfully!\n\nMessage: "${msg}"`);
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
      const isOnline = c.status === "active" && c.pppoeUsername && liveActiveNames.includes(c.pppoeUsername);
      const isExpired = c.status === "expired" || (daysLeft !== null && daysLeft < 0);
      const statusText = `${isExpired ? 'Expired' : 'Active'} (${isOnline ? 'Online' : 'Offline'})`;

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

  // Custom styling block for pulsing blink animation and print styles
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes glowing-blink {
        0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 2px rgba(57,255,20,0.8)); }
        50% { transform: scale(1.2); opacity: 0.4; filter: drop-shadow(0 0 6px rgba(57,255,20,0.2)); }
      }
      .online-pulsing-dot {
        animation: glowing-blink 1.2s infinite ease-in-out;
      }
      @media print {
        header, 
        aside, 
        .glass-panel, 
        .no-print, 
        .no-print-col,
        td.no-print-col,
        th.no-print-col,
        button {
          display: none !important;
        }
        body, html, main, .glass-card, table, .min-h-screen, .flex-1, .flex, #__next, [class*="min-h-screen"], [class*="flex-1"] {
          background: white !important;
          color: black !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          height: auto !important;
          min-height: auto !important;
          overflow: visible !important;
          position: relative !important;
        }
        table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        th, td {
          border: 1px solid #ddd !important;
          padding: 10px !important;
          color: black !important;
        }
        th {
          background-color: #f2f2f2 !important;
        }
        a {
          color: black !important;
          text-decoration: none !important;
        }
        span {
          background: transparent !important;
          color: black !important;
          border: none !important;
          padding: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="glass-card overflow-visible">
      {/* Dropdown Backdrop */}
      {activeDropdownId && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setActiveDropdownId(null)}
        />
      )}

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

        <div className="flex flex-row items-center gap-3 w-full sm:w-auto justify-end">
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
            className="glass-input px-4 py-2 bg-slate-800 focus:ring-neon-blue focus:ring-2 cursor-pointer text-xs font-semibold"
          >
            <option value="All Status" className="bg-slate-800">All Status</option>
            <option value="Active" className="bg-slate-800">Active (Paid)</option>
            <option value="Online" className="bg-slate-800">Online Now</option>
            <option value="Offline" className="bg-slate-800">Offline</option>
            <option value="Expired" className="bg-slate-800">Expired</option>
            <option value="Upcoming" className="bg-slate-800">Upcoming Expire (7 Days)</option>
            <option value="New This Month" className="bg-slate-800">New This Month</option>
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
                  const isExpired = customer.status === "expired" || (daysLeft !== null && daysLeft < 0);

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
                        <Link href={`/admin/customers/${customer.id}`} className="font-bold text-white hover:text-neon-blue text-base transition-colors">
                          {customer.name}
                        </Link>
                        <div className="text-sm text-gray-400">{customer.phone}</div>
                        <div className="text-xs text-gray-500 max-w-48 truncate">{customer.address || "No address"}</div>
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
                        <div className="text-gray-300 font-semibold">৳{customer.package?.price || "0"}</div>
                        <div className="text-xs text-neon-green mt-0.5">৳{customer.walletBalance || "0"}</div>
                      </td>

                      <td className="p-5 text-gray-300 font-mono text-sm">
                        {customer.expireDate 
                          ? new Date(customer.expireDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) 
                          : "N/A"}
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
                          {isExpired ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                              expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neon-blue/20 text-neon-blue border border-neon-blue/30 relative">
                              {isOnline && (
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green online-pulsing-dot mr-1" />
                              )}
                              active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Action Dropdown */}
                      <td className="p-5 text-right relative overflow-visible no-print-col">
                        <div className="flex items-center justify-end">
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
                                href={`/admin/customers/${customer.id}`} 
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Eye size={13} /> প্রোফাইল (Profile)
                              </Link>
                              
                              {/* 2. রিচার্জ করুন */}
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

                              {/* 3. এডিট */}
                              <Link 
                                href={`/admin/customers/${customer.id}/edit`} 
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Edit size={13} /> এডিট (Edit)
                              </Link>

                              {/* 4. টিকেট */}
                              <Link 
                                href={`/admin/tickets?userId=${customer.id}`} 
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <FileText size={13} /> টিকেট (Ticket List)
                              </Link>

                              {/* 5. নোট */}
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

                              {/* 6. ডিলিট */}
                              <button
                                onClick={() => {
                                  triggerDelete(customer.id, customer.name);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash size={13} /> ডিলিট (Delete)
                              </button>

                              {/* 7. মেসেজ */}
                              <button
                                onClick={() => {
                                  triggerSms(customer);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <MessageSquare size={13} /> মেসেজ (Send SMS)
                              </button>

                              {/* 8. ডিসকানেক্ট দিন */}
                              {customer.pppoeUsername && (
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
                                href={`/admin/tickets`} 
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

                {/* Status Indicator */}
                <div className="text-sm font-bold text-[#38bdf8] bg-[#0284c7]/10 border border-[#0284c7]/20 px-4 py-2.5 rounded-xl">
                  {rechargeCustomer.pppoeUsername || "User"} মোট টাকা ৳{displayDue}
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
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">বকেয়া (Due Amount)</label>
                    <input 
                      type="text"
                      value={displayDue} 
                      onChange={(e) => setOverrideDue(e.target.value)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
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

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">ডিসকাউন্ট (Discount)</label>
                    <input 
                      type="text" 
                      value={discount} 
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
                    />
                  </div>
                </div>

                {/* Conditional Fields based on Billing Type */}
                {billingType === "monthly" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">মাস সিলেক্ট করুন (Select Months)</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {selectedMonths.map((m) => (
                        <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0284c7]/20 text-[#38bdf8] border border-[#0284c7]/30 text-xs font-bold">
                          {m} 
                          <button 
                            type="button" 
                            onClick={() => setSelectedMonths(selectedMonths.filter(x => x !== m))}
                            className="text-red-400 hover:text-red-200"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !selectedMonths.includes(val)) {
                          setSelectedMonths([...selectedMonths, val]);
                        }
                        e.target.value = "";
                      }}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white"
                    >
                      <option value="">-- মাস নির্বাচন করুন --</option>
                      {getMonthsList().map((m) => (
                        <option key={m} value={m} disabled={selectedMonths.includes(m)} className="bg-slate-800">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">দিন সংখ্যা (Number of Days)</label>
                    <input 
                      type="text" 
                      value={rechargeDays} 
                      onChange={(e) => setRechargeDays(e.target.value)}
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white" 
                    />
                  </div>
                )}

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
                      নোট এবং তারিখ (Note and Date)
                    </label>
                  </div>
                </div>

                {showNoteDate && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-1"
                  >
                    <label className="block text-xs font-semibold text-gray-300">নোট (Note)</label>
                    <textarea 
                      value={rechargeNote} 
                      onChange={(e) => setRechargeNote(e.target.value)}
                      placeholder="পেমেন্ট বা রিচার্জ নোট লিখুন..." 
                      className="w-full glass-input px-3 py-2 bg-slate-800 text-xs text-white h-16 resize-none" 
                    />
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
  );
}
