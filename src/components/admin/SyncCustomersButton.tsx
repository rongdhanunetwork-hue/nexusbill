"use client";

import { useState } from "react";
import { DownloadCloud, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SyncCustomersButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/mikrotik/sync-customers", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Customers synced successfully");
        router.refresh();
      } else {
        alert(data.error || "Failed to sync customers");
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
      className="bg-purple-500/20 text-purple-400 border border-purple-500/50 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-500/30 flex items-center gap-2 transition-all disabled:opacity-50 no-print"
    >
      {syncing ? <Loader2 size={20} className="animate-spin" /> : <DownloadCloud size={20} />}
      Import from MikroTik
    </button>
  );
}
