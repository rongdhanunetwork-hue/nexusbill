"use client";

import { useState, useEffect } from "react";
import { Server, Plus, Trash2, Loader2, RefreshCw } from "lucide-react";

export default function IpPoolsClient({ routers }: { routers: any[] }) {
  const [selectedRouter, setSelectedRouter] = useState<string>(routers[0]?.id?.toString() || "");
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // New pool form
  const [name, setName] = useState("");
  const [ranges, setRanges] = useState("");

  const fetchPools = async () => {
    if (!selectedRouter) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/admin/ip-pools?routerId=${selectedRouter}`);
      const data = await res.json();
      if (res.ok) {
        setPools(data.pools);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert("Failed to fetch pools");
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchPools();
  }, [selectedRouter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ip-pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routerId: selectedRouter, name, ranges }),
      });
      const data = await res.json();
      if (res.ok) {
        setName("");
        setRanges("");
        fetchPools();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert("Error creating pool");
    }
    setLoading(false);
  };

  const handleDelete = async (poolId: string) => {
    if (!confirm("Are you sure you want to delete this IP Pool?")) return;
    
    try {
      const res = await fetch(`/api/admin/ip-pools?routerId=${selectedRouter}&poolId=${poolId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        fetchPools();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert("Error deleting pool");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Server className="text-neon-blue" />
          IP Pool Management
        </h1>
      </div>

      <div className="glass-card p-6">
        <div className="mb-6 max-w-sm">
          <label className="block text-sm text-gray-400 mb-2">Select Mikrotik Router</label>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-neon-blue transition-colors"
            value={selectedRouter}
            onChange={(e) => setSelectedRouter(e.target.value)}
          >
            {routers.map((r) => (
              <option key={r.id} value={r.id} className="bg-slate-900">{r.name} ({r.ipAddress})</option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5 h-fit">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Pool</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pool Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PPPoE-Pool-1"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-neon-blue text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">IP Ranges</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.10.2-192.168.10.254"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-neon-blue text-sm"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !selectedRouter}
                className="w-full flex items-center justify-center gap-2 py-2 bg-neon-blue text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                Create Pool
              </button>
            </form>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Existing Pools</h3>
              <button
                onClick={fetchPools}
                className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Refresh Pools"
              >
                <RefreshCw size={16} className={fetching ? "animate-spin text-neon-blue" : ""} />
              </button>
            </div>
            
            {fetching ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-neon-blue" size={30} />
              </div>
            ) : pools.length === 0 ? (
              <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                <p className="text-gray-400">No IP pools found on this router.</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium border-b border-white/5">Name</th>
                      <th className="p-4 font-medium border-b border-white/5">Ranges</th>
                      <th className="p-4 font-medium border-b border-white/5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pools.map((pool: any) => (
                      <tr key={pool[".id"]} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-white font-medium text-sm">{pool.name}</td>
                        <td className="p-4 text-gray-300 text-sm font-mono">{pool.ranges}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(pool[".id"])}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
                            title="Delete Pool"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
