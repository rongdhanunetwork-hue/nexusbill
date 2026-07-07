"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Trash2, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface Notification {
  id: number;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsHistory({ apiBasePath }: { apiBasePath: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchNotifications = async (pageNumber: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/history?page=${pageNumber}&limit=20`);
      const data = await res.json();
      if (data.items) {
        setNotifications(data.items);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page, apiBasePath]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(apiBasePath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: number | "all") => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      await fetch(`${apiBasePath}?id=${id}`, { method: "DELETE" });
      fetchNotifications(page);
    } catch (err) {
      console.error(err);
    }
  };

  const generatePageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= page - 2 && i <= page + 2)
      ) {
        pages.push(i);
      } else if (
        i === page - 3 || 
        i === page + 3
      ) {
        pages.push("...");
      }
    }
    return pages.filter((p, idx, arr) => p !== "..." || arr[idx - 1] !== "...");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="text-amber-400" />
            Notifications History
          </h1>
          <p className="text-gray-400 text-sm mt-1">Total {total} notifications</p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={() => deleteNotification("all")}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg text-sm transition-colors"
          >
            <Trash2 size={16} />
            Delete All
          </button>
        )}
      </div>

      <div className="bg-[#1a1f2e] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <Bell className="mb-2 opacity-30" size={32} />
            <p>No notifications found in history.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((n) => (
              <div key={n.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-white/[0.02] ${!n.isRead ? 'bg-white/[0.03]' : ''}`}>
                <div className="flex-1 flex gap-4">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!n.isRead ? 'bg-amber-400' : 'bg-transparent'}`} />
                  <div>
                    <h3 className={`text-sm ${!n.isRead ? 'text-white font-semibold' : 'text-gray-300'}`}>{n.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{n.message}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] text-gray-500">{new Date(n.createdAt).toLocaleString('en-GB')}</span>
                      {n.link && (
                        <Link href={n.link} onClick={() => !n.isRead && markAsRead(n.id)} className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                          View details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto ml-6 md:ml-0">
                  {!n.isRead && (
                    <button onClick={() => markAsRead(n.id)} className="p-2 text-gray-400 hover:text-green-400 bg-white/5 hover:bg-green-500/10 rounded-lg transition-colors" title="Mark as read">
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(n.id)} className="p-2 text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between gap-4">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {generatePageNumbers().map((p, i) => (
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-500">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? 'bg-amber-400 text-black' : 'text-gray-300 hover:bg-white/10'}`}
                  >
                    {p}
                  </button>
                )
              ))}
            </div>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
