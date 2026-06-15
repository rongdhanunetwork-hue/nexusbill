"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SyncPackagesButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/mikrotik/sync-packages", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Packages synced successfully");
        router.refresh();
      } else {
        alert(data.error || "Failed to sync packages");
      }
    } catch (err) {
      alert("Network error during sync");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-4 py-2 rounded-lg font-medium hover:bg-emerald-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
    >
      {syncing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
      Sync from Mikrotik
    </button>
  );
}
