"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Search, Edit, Trash, Wifi, WifiOff, Eye, Zap, Clock, 
  MoreHorizontal, X, Check, HelpCircle, AlertCircle, Save,
  FileText, MessageSquare, ShieldAlert, LogOut, CheckCircle2, Download, FileUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePopup } from "@/components/ui/PopupProvider";

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
  autoRenew?: boolean | null;
  mikrotikId?: number | null;
}

export default function CustomersClient({
  allCustomers,
  deleteCustomerAction,
  activePppoeNames = [],
  activeSessions = [],
  initialStatus = "All Status",
  resellers = [],
  role = "admin",
}: {
  allCustomers: Customer[];
  deleteCustomerAction?: (formData: FormData) => Promise<void>;
  activePppoeNames?: string[];
  activeSessions?: any[];
  initialStatus?: string;
  resellers?: {id: number, name: string}[];
  role?: "admin" | "reseller" | "employee";
}) {
  const basePath = role === "reseller" ? "/reseller" : role === "employee" ? "/employee" : "/admin";
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  // Import CSV modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const { showConfirm, showAlert } = usePopup();
  
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

  // loadPaged removed to prevent overwriting allCustomers with partial data

  useEffect(() => {
    const refreshData = () => {
      fetch("/api/admin/mikrotik/pppoe")
        .then((res) => res.json())
        .then((data) => {
          if (data.active && Array.isArray(data.active)) {
            setLiveActiveSessions(data.active);
            setLiveActiveNames(data.active.map((s: any) => s.name));
          }
          // NOTE: avoid re-fetching the full customers list on every poll —
          // keep the existing customersList in memory and only update active sessions.
        })
        .catch((err) => {
          console.error("Failed to fetch active sessions client-side:", err);
        });
    };

    refreshData();
    const interval = setInterval(refreshData, 20000); // Poll every 20s for real-time status & sync
    return () => clearInterval(interval);
  }, []);

  // Build quick lookup maps for active sessions to avoid O(n^2) finds
  const activeSessionMap = useMemo(() => {
    const map = new Map<string, any>();
    (liveActiveSessions || []).forEach((s: any) => {
      if (s && s.name) map.set(String(s.name).toLowerCase(), s);
    });
    return map;
  }, [liveActiveSessions]);

  const activeNamesSet = useMemo(() => new Set(activeSessionMap.keys()), [activeSessionMap]);

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
  const [modalAutoRenew, setModalAutoRenew] = useState(false);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedCustomerIds([]);
  }, [searchTerm, selectedAreaId, selectedPackageId, statusFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedAreaId, selectedPackageId, statusFilter]);

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
  const filteredCustomers = useMemo(() => {
    return customersList.filter((customer) => {
    const matchesSearch =
      (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || "").includes(searchTerm) ||
      (customer.pppoeUsername || "").toLowerCase().includes(searchTerm.toLowerCase());

    const samePppoeCustomers = customersList
      .filter((c) => c.pppoeUsername && c.pppoeUsername.toLowerCase() === customer.pppoeUsername?.toLowerCase())
      .sort((a: any, b: any) => {
        if (!a.resellerId && b.resellerId) return -1;
        if (a.resellerId && !b.resellerId) return 1;
        return a.id - b.id;
      });
    const isPrimaryPppoeOwner = samePppoeCustomers.length > 0 ? samePppoeCustomers[0].id === customer.id : true;

    const activeSession = customer.pppoeUsername && isPrimaryPppoeOwner
      ? activeSessionMap.get(customer.pppoeUsername!.toLowerCase()) || null
      : null;
    const daysLeft = getDaysLeft(customer.expireDate);
    // Only mark as expired if status is explicitly 'expired' OR has a past expireDate
    // NOT having expireDate with status='active' means new/not-yet-billed — NOT expired
    const isExpired = customer.status === "expired" || (customer.expireDate && daysLeft !== null && daysLeft < 0);

    let displayStatus: "online" | "active" | "offline" = "offline";
    if (activeSession) {
      // If connected to MikroTik → always show as online
      displayStatus = "online";
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
      (statusFilter === "Auto Renew Enabled" && customer.autoRenew === true) ||
      (statusFilter === "New This Month" && !!isNewThisMonth) ||
      (statusFilter === "Paid (Month)" && customer.status === "active" && !isExpired) ||
      (statusFilter === "Unpaid (Month)" && isExpired);

    const matchesArea = selectedAreaId === "All Areas" || String(customer.areaId) === selectedAreaId;
    const matchesPackage = selectedPackageId === "All Packages" || String(customer.packageId) === selectedPackageId;

    return matchesSearch && matchesStatus && matchesArea && matchesPackage;
    });
  }, [customersList, searchTerm, selectedAreaId, selectedPackageId, statusFilter, activeSessionMap, areasList]);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

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
    const daysVal = parseInt(rechargeDays) || 1;
    durationVal = daysVal;
    const dailyRate = monthlyPrice / 30;
    calculatedAmount = Math.round(dailyRate * daysVal);
  }

  // Use overrideCalculated if the user typed something, otherwise use the calculatedAmount
  // But if calculatedAmount changes significantly (e.g. they change days or package), we might want to update.
  // Actually, standard behavior: display calculatedAmount if overrideCalculated is empty.
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

  // Reset overrides when recharge configuration inputs change, EXCEPT for customExpireDate which updates frequently
  useEffect(() => {
    setOverrideCalculated("");
    setOverridePaid("");
    setOverrideDue("");
  }, [rechargeCustomer, billingType, selectedMonths, rechargeDays, discount, selectedNewPackageId, customBaseDate]);

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
      setModalAutoRenew(false);
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

  // ------- Import CSV handlers -------
const handleImportSubmit = async () => {
  if (!importFile) return;
  setImportLoading(true);
  try {
    const csvText = await importFile.text();
    const res = await fetch('/api/admin/customers/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText }),
    });
    const data = await res.json();
    if (res.ok) {
        await showAlert({ title: 'Success', message: data.message || 'Imported successfully', type: 'success' });
        setShowImportModal(false);
        const refreshed = await fetch('/api/admin/customers?page=1&pageSize=200');
        const d = await refreshed.json();
        if (Array.isArray(d)) setCustomersList(d);
        else if (d && Array.isArray(d.items)) setCustomersList(d.items);
    } else {
      await showAlert({ title: 'Error', message: data.error || 'Import failed', type: 'error' });
    }
  } catch {
    await showAlert({ title: 'Error', message: 'Network error', type: 'error' });
  } finally {
    setImportLoading(false);
  }
};


  // Trigger server delete action
  const triggerDelete = async (id: number, name: string) => {
    const isConfirm = await showConfirm({
      title: "Delete Customer",
      message: `Are you sure you want to delete customer "${name}"?`,
      danger: true,
      confirmText: "Delete"
    });
    if (isConfirm) {
      if (deleteCustomerAction) {
        const formData = new FormData();
        formData.append("id", String(id));
        deleteCustomerAction(formData).then(() => {
          window.location.reload();
        });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomerIds.length === 0) return;

    const isConfirm = await showConfirm({
      title: "Bulk Delete Customers",
      message: `Are you sure you want to delete ${selectedCustomerIds.length} selected customer(s)? This action is permanent and will remove their MikroTik secrets.`,
      danger: true,
      confirmText: "Delete All"
    });

    if (isConfirm) {
      try {
        const res = await fetch("/api/admin/customers", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: selectedCustomerIds }),
        });

        const data = await res.json();
        if (res.ok) {
          await showAlert({
            title: "Success",
            message: data.message || "Customers deleted successfully.",
            type: "success",
          });
          setSelectedCustomerIds([]);
          window.location.reload();
        } else {
          await showAlert({
            title: "Error",
            message: data.error || "Failed to delete customers.",
            type: "error",
          });
        }
      } catch (err) {
        await showAlert({
          title: "Error",
          message: "Network error occurred.",
          type: "error",
        });
      }
    }
  };

  // Kick MikroTik active session
  const triggerKick = async (username: string, routerId?: number | null) => {
    const isConfirm = await showConfirm({
      title: "Terminate Session",
      message: `Are you sure you want to terminate active session for "${username}"?`,
      danger: true,
      confirmText: "Terminate"
    });
    if (!isConfirm) return;
    
    try {
      const res = await fetch("/api/admin/mikrotik/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", name: username, routerId }),
      });
      const d = await res.json();
      if (res.ok) {
        await showAlert({ title: "Success", message: d.message || "Session disconnected successfully", type: "success" });
        window.location.reload();
      } else {
        await showAlert({ title: "Failed", message: d.error || "Action failed", type: "error" });
      }
    } catch {
      await showAlert({ title: "Error", message: "Network error", type: "error" });
    }
  };

  // Suspend Customer (Change status to expired)
  const triggerSuspend = async (customer: Customer) => {
    const isConfirm = await showConfirm({
      title: "Suspend Customer",
      message: `Are you sure you want to suspend "${customer.name}"? This will disable their internet connection.`,
      danger: true,
      confirmText: "Suspend"
    });
    if (!isConfirm) return;
    
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "expired" }),
      });
      const d = await res.json();
      if (res.ok) {
        await showAlert({ title: "Suspended", message: "Customer suspended successfully.", type: "success" });
        window.location.reload();
      } else {
        await showAlert({ title: "Failed", message: d.error || "Action failed", type: "error" });
      }
    } catch {
      await showAlert({ title: "Error", message: "Network error", type: "error" });
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
        await showAlert({ title: "Sent", message: "SMS sent successfully!", type: "success" });
      } else {
        await showAlert({ title: "Failed", message: data.error || "Failed to send SMS", type: "error" });
      }
    } catch {
      await showAlert({ title: "Error", message: "Network error while sending SMS", type: "error" });
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
      const activeSession = c.pppoeUsername ? activeSessionMap.get(c.pppoeUsername!.toLowerCase()) || null : null;
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-blue/10 border border-neon-blue/20 rounded-lg text-neon-blue font-bold text-xs no-print">
            Total: {filteredCustomers.length}
          </div>
          <div className="flex gap-2">
            {selectedCustomerIds.length > 0 && role !== "employee" && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded-xl hover:bg-rose-500/30 text-xs font-bold transition-all flex items-center gap-2 animate-pulse"
                title="Delete selected customers"
              >
                <Trash size={14} /> ডিলিট ({selectedCustomerIds.length})
              </button>
            )}
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
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-2"
              title="Import customers from CSV"
            >
              <FileUp size={14} /> Import CSV
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
            <option value="Auto Renew Enabled" className="bg-slate-800">Auto Renew Enabled</option>
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
              <th className="p-5 w-24 no-print-col">
                <div className="flex items-center gap-3 justify-center">
                  <input
                    type="checkbox"
                    checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedCustomerIds.includes(c.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomerIds(paginatedCustomers.map(c => c.id));
                      } else {
                        setSelectedCustomerIds([]);
                      }
                    }}
                    className="rounded bg-slate-850 border-white/15 text-neon-blue focus:ring-neon-blue focus:ring-1 cursor-pointer w-4 h-4"
                  />
                  <span className="text-gray-500 w-4 text-center">#</span>
                </div>
              </th>
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
                  <td colSpan={8} className="p-12 text-center text-gray-500">
                    <WifiOff size={40} className="mx-auto mb-3 text-gray-600" />
                    No customers found matching the criteria.
                  </td>
                </motion.tr>
              ) : (
                paginatedCustomers.map((customer, index) => {
                    const globalIndex = (currentPage - 1) * pageSize + index;
                    const daysLeft = getDaysLeft(customer.expireDate);
                    const activeSession = customer.pppoeUsername ? activeSessionMap.get(customer.pppoeUsername!.toLowerCase()) || null : null;
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
                        {/* Checkbox Column */}
                        <td className="p-5 no-print-col">
                          <div className="flex items-center gap-3 justify-center">
                            <input
                              type="checkbox"
                              checked={selectedCustomerIds.includes(customer.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCustomerIds(prev => [...prev, customer.id]);
                                } else {
                                  setSelectedCustomerIds(prev => prev.filter(id => id !== customer.id));
                                }
                              }}
                              className="rounded bg-slate-850 border-white/15 text-neon-blue focus:ring-neon-blue focus:ring-1 cursor-pointer w-4 h-4"
                            />
                            <span className="text-gray-400 font-mono text-[10px] w-4 text-left">
                              {(currentPage - 1) * pageSize + index + 1}
                            </span>
                          </div>
                        </td>

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
                                  onClick={async () => {
                                    const n = prompt("কাস্টমার নোট এডিট করুন:", customer.address || "");
                                    if (n !== null) {
                                      await showAlert({ title: "Success", message: "নোট সংরক্ষিত হয়েছে!", type: "success" });
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
                                <>
                                  <button
                                    onClick={() => {
                                      triggerKick(customer.pppoeUsername!, customer.mikrotikId);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/10 transition-colors"
                                  >
                                    <LogOut size={13} /> ডিসকানেক্ট দিন (Kick)
                                  </button>
                                  <button
                                    onClick={() => {
                                      triggerSuspend(customer);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                                  >
                                    <ShieldAlert size={13} /> Suspend (লাইন বন্ধ করুন)
                                  </button>
                                </>
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between p-5 border-t border-white/5 bg-white/2 no-print-col mt-4">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div>
            Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-white">
              {Math.min(currentPage * pageSize, filteredCustomers.length)}
            </span>{" "}
            of <span className="font-semibold text-white">{filteredCustomers.length}</span> customers
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSizeSelect">Rows per page:</label>
            <select
              id="pageSizeSelect"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-neon-blue"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000000}>All</option>
            </select>
          </div>
        </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {(() => {
              const totalPages = Math.ceil(filteredCustomers.length / pageSize);
              const pages = [];
              const maxVisible = 5;
              
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, start + maxVisible - 1);
              
              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }
              
              for (let i = start; i <= end; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      currentPage === i
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredCustomers.length / pageSize)))}
              disabled={currentPage === Math.ceil(filteredCustomers.length / pageSize)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all"
            >
              Next
            </button>
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
            const activeSession = customer.pppoeUsername ? activeSessionMap.get(customer.pppoeUsername!.toLowerCase()) || null : null;
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

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileUp size={18} className="text-neon-blue" /> Import Customers (CSV)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              CSV-এ এই columns থাকতে হবে:<br />
              <code className="text-neon-blue text-[11px]">Name, Phone, PPPoE Username, Password, Address, Package, Area</code>
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full mb-4 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-neon-blue/20 file:text-neon-blue hover:file:bg-neon-blue/30 cursor-pointer"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); }}
                className="flex-1 px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={importLoading || !importFile}
                className="flex-1 px-4 py-2 bg-neon-blue text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                {importLoading ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
  </>
  );
}
