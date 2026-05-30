"use client";

import { useState } from "react";
import { Search, Activity, Calendar, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date | null;
  user?: {
    name: string;
    role: string;
  };
}

export default function AuditLogsClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const filteredLogs = initialLogs.filter(log => {
    const matchesSearch = log.user?.name.toLowerCase().includes(search.toLowerCase()) || 
                          log.action.toLowerCase().includes(search.toLowerCase()) ||
                          (log.details && log.details.toLowerCase().includes(search.toLowerCase()));
    
    const matchesAction = filterAction ? log.action.includes(filterAction) : true;
    
    return matchesSearch && matchesAction;
  });

  const getActionColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("REMOVE")) return "text-red-400 bg-red-500/20";
    if (action.includes("CREATE") || action.includes("ADD")) return "text-neon-green bg-neon-green/20";
    if (action.includes("UPDATE") || action.includes("EDIT")) return "text-blue-400 bg-blue-500/20";
    if (action.includes("LOGIN") || action.includes("AUTH")) return "text-purple-400 bg-purple-500/20";
    return "text-gray-400 bg-white/10";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search logs, users, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-neon-blue transition-colors"
          />
        </div>
        
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="glass-input px-4 py-2 w-full sm:w-auto"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Creates</option>
          <option value="UPDATE">Updates</option>
          <option value="DELETE">Deletes</option>
          <option value="LOGIN">Logins</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                <th className="p-4">Time</th>
                <th className="p-4">User</th>
                <th className="p-4">Action</th>
                <th className="p-4">IP Address</th>
                <th className="p-4 w-1/3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-400 font-mono text-xs whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A"}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-white">{log.user?.name || `ID: ${log.userId}`}</div>
                    <div className="text-xs text-gray-400 uppercase">{log.user?.role}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 font-mono text-xs">
                    {log.ipAddress || "N/A"}
                  </td>
                  <td className="p-4 text-xs text-gray-300 break-words max-w-xs">
                    {log.details ? (
                      <div className="bg-slate-900 p-2 rounded border border-white/5 font-mono overflow-x-auto">
                        {log.details}
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <ShieldAlert size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No audit logs found matching criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
