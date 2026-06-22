"use client";

import { useState } from "react";
import { Plus, Trash2, Box, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { usePopup } from "@/components/ui/PopupProvider";

interface TJBox {
  id: number;
  name: string;
  address: string | null;
  portCount: number | null;
  status: boolean | null;
  createdAt: Date | null;
}

export default function TJBoxesClient({
  initialBoxes,
  createBox,
  deleteBox,
}: {
  initialBoxes: TJBox[];
  createBox: (n: string, a: string, p: number) => Promise<{ success?: boolean; error?: string }>;
  deleteBox: (id: number) => Promise<{ success?: boolean; error?: string }>;
}) {
  const [boxes, setBoxes] = useState(initialBoxes);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [portCount, setPortCount] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { showConfirm, showAlert } = usePopup();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createBox(name, address, portCount);
    setLoading(false);
    
    if (res.error) {
      await showAlert({ title: "Error", message: res.error, type: "error" });
    } else {
      await showAlert({ title: "Success", message: "TJ Box created successfully!", type: "success" });
      setName("");
      setAddress("");
      setPortCount(8);
      // Wait for server revalidation to refresh list
    }
  }

  async function handleDelete(id: number) {
    const confirmed = await showConfirm({
        title: "Delete TJ Box",
        message: "Are you sure you want to delete this TJ Box? This action cannot be undone.",
        confirmText: "Delete",
        confirmStyle: "danger"
    });
    if (!confirmed) return;

    setDeletingId(id);
    const res = await deleteBox(id);
    setDeletingId(null);

    if (res.error) {
      await showAlert({ title: "Error", message: res.error, type: "error" });
    } else {
      await showAlert({ title: "Success", message: "TJ Box deleted successfully!", type: "success" });
      setBoxes(boxes.filter(b => b.id !== id));
    }
  }

  return (
    <div className="p-6 md:p-10 space-y-8 animate-fade-in">
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
          <Box size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TJ Boxes / Splitters</h1>
          <p className="text-gray-400 text-sm mt-1">Manage field distribution boxes and splitters.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-white mb-6">Add New TJ Box</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Box Name *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Badda-TJ-101"
                className="w-full glass-input px-4 py-3 bg-slate-950 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Address / Location</label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Physical location description"
                className="w-full glass-input px-4 py-3 bg-slate-950 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Port Count</label>
              <input
                type="number"
                value={portCount}
                onChange={e => setPortCount(Number(e.target.value))}
                min="1"
                className="w-full glass-input px-4 py-3 bg-slate-950 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <button
              disabled={loading || !name}
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} />}
              <span>Add TJ Box</span>
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-white mb-6">Existing TJ Boxes</h2>
          
          {initialBoxes.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-slate-950/50 rounded-xl">
              No TJ boxes found. Create your first one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initialBoxes.map(box => (
                <motion.div
                  key={box.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950 p-5 rounded-xl border border-white/5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white text-lg">{box.name}</h3>
                      <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg">
                        {box.portCount} Ports
                      </span>
                    </div>
                    {box.address && <p className="text-sm text-gray-400 mb-4">{box.address}</p>}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <span className="text-xs text-gray-500">
                      Added {new Date(box.createdAt!).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDelete(box.id)}
                      disabled={deletingId === box.id}
                      className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                      {deletingId === box.id ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
