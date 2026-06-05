"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Phone,
  MessageSquare,
  Trash2
} from "lucide-react";

interface SmsLog {
  id: number;
  phone: string;
  message: string;
  type: string | null;
  status: string | null;
  sentAt: string | null;
}

export default function SmsLogPage() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [search, statusFilter, typeFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredLogs.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  async function fetchLogs() {
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await fetch("/api/admin/sms-log");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLog(id: number) {
    if (!confirm("Are you sure you want to delete this SMS log entry?")) return;
    try {
      const res = await fetch(`/api/admin/sms-log?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((log) => log.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete log");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete log");
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected SMS log entries?`)) return;
    try {
      const res = await fetch(`/api/admin/sms-log?ids=${selectedIds.join(",")}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((log) => !selectedIds.includes(log.id)));
        setSelectedIds([]);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete selected logs");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete selected logs");
    }
  }

  async function handleClearAll() {
    if (!confirm("Warning: This will permanently clear all SMS delivery logs! Are you sure?")) return;
    try {
      const res = await fetch("/api/admin/sms-log", {
        method: "DELETE",
      });
      if (res.ok) {
        setLogs([]);
        setSelectedIds([]);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to clear logs");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to clear logs");
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.phone.toLowerCase().includes(search.toLowerCase()) ||
      log.message.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || log.status === statusFilter;

    const matchesType =
      typeFilter === "all" || log.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "sent":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neon-green/10 text-neon-green border border-neon-green/20 flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> Sent
          </span>
        );
      case "failed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 w-fit">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  const getTypeBadge = (type: string | null) => {
    const formatted = type ? type.toUpperCase() : "UNKNOWN";
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400 uppercase">
        {formatted}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
            <History className="text-neon-blue" /> SMS Delivery Logs
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            গ্রাহকদের কাছে পাঠানো প্রতিটি SMS এর স্থিতি এবং তথ্য এখানে ট্র্যাক করুন।
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm font-semibold hover:bg-red-500/30 transition text-red-300 cursor-pointer animate-pulse"
            >
              <Trash2 size={16} />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={handleClearAll}
            disabled={loading || logs.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-semibold hover:bg-red-500/20 transition disabled:opacity-50 text-red-300 cursor-pointer"
          >
            <Trash2 size={16} />
            Clear All
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-50 text-white cursor-pointer"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin text-neon-blue" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh Log
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search phone, message content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 bg-slate-900/30 text-white border border-white/10 focus:border-neon-blue/50 rounded-xl text-sm"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full glass-input px-4 py-2.5 bg-slate-900/30 text-white border border-white/10 focus:border-neon-blue/50 rounded-xl text-sm select-chevron"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full glass-input px-4 py-2.5 bg-slate-900/30 text-white border border-white/10 focus:border-neon-blue/50 rounded-xl text-sm select-chevron"
          >
            <option value="all">All Types</option>
            <option value="manual">Manual</option>
            <option value="payment">Payment Success</option>
            <option value="expiry">Expiry Notification</option>
            <option value="reminder">Reminder SMS</option>
            <option value="bulk">Bulk Campaign</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-neon-blue" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-white/5 shadow-2xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/5 text-gray-400 uppercase text-[11px] font-bold tracking-wider">
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-white/10 bg-slate-800 text-neon-blue focus:ring-neon-blue w-4 h-4 cursor-pointer"
                      checked={filteredLogs.length > 0 && selectedIds.length === filteredLogs.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">SMS Content</th>
                  <th className="px-6 py-4">Campaign Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Sent At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No SMS logs matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`hover:bg-white/5 transition-colors ${selectedIds.includes(log.id) ? "bg-white/5" : ""}`}
                      >
                        {/* Checkbox */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="rounded border-white/10 bg-slate-800 text-neon-blue focus:ring-neon-blue w-4 h-4 cursor-pointer"
                            checked={selectedIds.includes(log.id)}
                            onChange={(e) => handleSelectRow(log.id, e.target.checked)}
                          />
                        </td>

                        {/* Recipient */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neon-blue">
                              <Phone size={14} />
                            </div>
                            <span className="font-semibold text-white text-sm">{log.phone}</span>
                          </div>
                        </td>

                        {/* Content */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2 max-w-lg">
                            <div className="mt-0.5 text-gray-500 shrink-0">
                              <MessageSquare size={14} />
                            </div>
                            <span className="text-gray-300 text-sm whitespace-pre-wrap break-all leading-normal">
                              {log.message}
                            </span>
                          </div>
                        </td>

                        {/* Campaign Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(log.type)}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(log.status)}
                        </td>

                        {/* Sent At */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString("en-BD") : "N/A"}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Delete Log"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
