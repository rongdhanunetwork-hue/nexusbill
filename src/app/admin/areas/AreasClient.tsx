"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Compass, Box, Trash2, Plus, Layers, Search, ChevronRight, ChevronDown, List } from "lucide-react";
import { usePopup } from "@/components/ui/PopupProvider";
import { Pagination } from "@/components/ui/Pagination";

interface AreaItem {
  id: number;
  name: string;
  type: string; // 'area', 'subarea', 'polebox'
  parentId: number | null;
  createdAt: Date | null;
}

interface AreasClientProps {
  initialAreas: any[];
  createArea: (name: string, type: string, parentId: number | null) => Promise<{ success?: boolean; error?: string }>;
  deleteArea: (id: number) => Promise<{ success?: boolean; error?: string }>;
}

export default function AreasClient({ initialAreas, createArea, deleteArea }: AreasClientProps) {
  const [areas, setAreas] = useState<AreaItem[]>(initialAreas);
  const [activeTab, setActiveTab] = useState<"tree" | "list">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const { showConfirm, showAlert } = usePopup();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("area");
  const [parentId, setParentId] = useState<string>("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Filter parents based on selected type
  // Sub-area needs an Area as parent
  // Pole Box needs a Sub-area as parent
  const parentCandidates = areas.filter((item) => {
    if (type === "subarea") return item.type === "area";
    if (type === "polebox") return item.type === "subarea";
    return false;
  });

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (type !== "area" && !parentId) {
      setError(`Parent ${type === "subarea" ? "Area" : "Sub-area"} is required`);
      return;
    }

    const pId = parentId ? parseInt(parentId) : null;

    startTransition(async () => {
      const res = await createArea(name, type, pId);
      if (res.error) {
        setError(res.error);
      } else {
        setName("");
        setParentId("");
        // Local update
        // The page will revalidate and update props, but let's update local state immediately
        const tempId = Math.max(...areas.map(a => a.id), 0) + 1;
        setAreas([{
          id: tempId,
          name: name.trim(),
          type,
          parentId: pId,
          createdAt: new Date()
        }, ...areas]);
      }
    });
  };

  // Handle Delete
  const handleDelete = async (id: number) => {
    const isConfirm = await showConfirm({
      title: "Delete Item",
      message: "Are you sure? Deleting an item will recursively delete all sub-items under it!",
      danger: true,
      confirmText: "Delete"
    });
    if (!isConfirm) return;

    startTransition(async () => {
      const res = await deleteArea(id);
      if (res.error) {
        await showAlert({ title: "Failed", message: res.error, type: "error" });
      } else {
        // Recursively remove deleted items from local state
        const getDescendants = (parentId: number): number[] => {
          const children = areas.filter(a => a.parentId === parentId);
          return [parentId, ...children.flatMap(c => getDescendants(c.id))];
        };
        const idsToRemove = new Set(getDescendants(id));
        setAreas(areas.filter(a => !idsToRemove.has(a.id)));
      }
    });
  };

  // Build Hierarchical Tree
  const areaItems = areas.filter(a => a.type === "area");
  const subAreaItems = areas.filter(a => a.type === "subarea");
  const poleBoxItems = areas.filter(a => a.type === "polebox");

  // Search filtering
  const filteredAreas = areas.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedAreas = filteredAreas.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Layers className="text-neon-blue" size={26} /> Area & Pole Box Hierarchy
          </h1>
          <p className="text-sm text-gray-400">Organize your internet customers by Area → Sub-area → Pole Box</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("tree")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === "tree" ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30" : "text-gray-400 hover:text-white"
            }`}
          >
            <Layers size={14} /> Tree View
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === "list" ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30" : "text-gray-400 hover:text-white"
            }`}
          >
            <List size={14} /> Flat Table
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="glass-card p-6 lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-white tracking-wide border-b border-white/10 pb-3 flex items-center gap-2">
            <Plus size={18} className="text-neon-blue" /> Add Hierarchy Item
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Dhanmondi, Sector 4, Box-A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-neon-blue rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hierarchy Type</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setParentId("");
                }}
                className="w-full bg-slate-900 border border-white/10 focus:border-neon-blue rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
              >
                <option value="area">📍 Area (Root Level)</option>
                <option value="subarea">🧭 Sub-Area (Under Area)</option>
                <option value="polebox">📦 Pole Box (Under Sub-Area)</option>
              </select>
            </div>

            {type !== "area" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Parent {type === "subarea" ? "Area" : "Sub-Area"}
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 focus:border-neon-blue rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                >
                  <option value="">Select Parent...</option>
                  {parentCandidates.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border border-neon-blue/50 py-2.5 rounded-xl font-semibold tracking-wider text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isPending ? "Adding..." : <> <Plus size={18} /> Add Item </>}
            </button>
          </form>
        </div>

        {/* Right Column: Tree or List view */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar */}
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search areas, sub-areas, pole boxes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-white text-sm placeholder:text-gray-500"
            />
          </div>

          <div className="glass-card p-6 min-h-[400px]">
            {activeTab === "tree" ? (
              /* TREE VIEW */
              <div className="space-y-4">
                {areaItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No area hierarchy created yet.</div>
                ) : (
                  areaItems.map((area) => {
                    const subAreas = subAreaItems.filter(s => s.parentId === area.id);
                    return (
                      <div key={area.id} className="border border-white/5 rounded-xl p-4 bg-white/2">
                        {/* Area Row */}
                        <div className="flex justify-between items-center group">
                          <span className="flex items-center gap-2 text-white font-bold text-base">
                            <MapPin size={18} className="text-neon-blue" /> {area.name}
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">Area</span>
                          </span>
                          <button
                            onClick={() => handleDelete(area.id)}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-opacity p-1.5 rounded-lg hover:bg-white/5"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Nested Sub-Areas */}
                        {subAreas.length > 0 && (
                          <div className="pl-6 mt-3 space-y-3 border-l border-white/5">
                            {subAreas.map((subArea) => {
                              const boxes = poleBoxItems.filter(b => b.parentId === subArea.id);
                              return (
                                <div key={subArea.id} className="group">
                                  <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2 text-gray-300 font-semibold text-sm">
                                      <Compass size={16} className="text-emerald-400" /> {subArea.name}
                                      <span className="text-[9px] uppercase font-semibold px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400">Sub-Area</span>
                                    </span>
                                    <button
                                      onClick={() => handleDelete(subArea.id)}
                                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-opacity p-1 rounded-lg hover:bg-white/5"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>

                                  {/* Nested Pole Boxes */}
                                  {boxes.length > 0 && (
                                    <div className="pl-6 mt-2 space-y-1.5 border-l border-white/5">
                                      {boxes.map((box) => (
                                        <div key={box.id} className="flex justify-between items-center group/box">
                                          <span className="flex items-center gap-2 text-gray-400 text-xs font-mono">
                                            <Box size={14} className="text-yellow-400" /> {box.name}
                                            <span className="text-[8px] uppercase font-mono px-1.5 rounded bg-yellow-500/10 text-yellow-400">Box</span>
                                          </span>
                                          <button
                                            onClick={() => handleDelete(box.id)}
                                            className="opacity-0 group-hover/box:opacity-100 hover:text-red-400 text-gray-500 transition-opacity p-1 rounded-lg hover:bg-white/5"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* FLAT TABLE VIEW */
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white/2">
                      <th className="p-4">ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Parent Location</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {filteredAreas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">No items found.</td>
                      </tr>
                    ) : (
                      paginatedAreas.map((item) => {
                        const parent = item.parentId ? areas.find(a => a.id === item.parentId) : null;
                        return (
                          <tr key={item.id} className="hover:bg-white/2 transition-colors text-sm">
                            <td className="p-4 font-mono text-xs">{item.id}</td>
                            <td className="p-4 font-bold text-white">{item.name}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.type === "area" ? "bg-blue-500/10 text-blue-400" :
                                item.type === "subarea" ? "bg-emerald-500/10 text-emerald-400" :
                                "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-gray-400">
                              {parent ? `${parent.name} (${parent.type})` : "None (Root)"}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {filteredAreas.length > 0 && (
                  <div className="p-4 border-t border-white/10">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.max(1, Math.ceil(filteredAreas.length / pageSize))}
                      totalItems={filteredAreas.length}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
