"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Link2, Globe, Edit2, Check,
  ChevronDown, ChevronUp, Save, Loader2, FolderPlus, X
} from "lucide-react";

type ServiceLink = {
  id: number;
  name: string;
  url: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type ServiceCategory = {
  id: number;
  name: string;
  icon: string;
  type: string;
  color: string;
  isActive: boolean;
  links: ServiceLink[];
};

const TYPE_OPTIONS = [
  { value: "general", label: "General", icon: "🔗" },
  { value: "ftp", label: "FTP Server", icon: "💾" },
  { value: "live_tv", label: "Live TV", icon: "📺" },
  { value: "app_download", label: "App Download", icon: "📱" },
  { value: "game", label: "Game Server", icon: "🎮" },
];

const COLOR_PRESETS = [
  "#00f3ff", "#a78bfa", "#4ade80", "#fb923c", "#f472b6",
  "#facc15", "#38bdf8", "#f87171",
];

export default function AdminServicesClient() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  // New Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("🔗");
  const [catType, setCatType] = useState("general");
  const [catColor, setCatColor] = useState("#00f3ff");
  const [savingCat, setSavingCat] = useState(false);

  // Edit Category form
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatData, setEditCatData] = useState({ name: "", icon: "", type: "", color: "" });

  // New Link form
  const [linkForms, setLinkForms] = useState<Record<number, { name: string; url: string; description: string; saving: boolean }>>({});

  // Edit Link form
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [editLinkData, setEditLinkData] = useState({ name: "", url: "", description: "" });

  async function fetchCategories() {
    setLoading(true);
    const res = await fetch("/api/admin/services");
    if (res.ok) setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  async function addCategory() {
    if (!catName.trim()) return;
    setSavingCat(true);
    await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "category", name: catName, icon: catIcon, categoryType: catType, color: catColor }),
    });
    setCatName(""); setCatIcon("🔗"); setCatType("general"); setCatColor("#00f3ff");
    setShowCatForm(false);
    setSavingCat(false);
    fetchCategories();
  }

  async function updateCategory(id: number) {
    if (!editCatData.name.trim()) return;
    await fetch("/api/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "category", id, name: editCatData.name, icon: editCatData.icon, categoryType: editCatData.type, color: editCatData.color }),
    });
    setEditingCatId(null);
    fetchCategories();
  }

  async function addLink(categoryId: number) {
    const form = linkForms[categoryId];
    if (!form?.name?.trim() || !form?.url?.trim()) return;
    setLinkForms(prev => ({ ...prev, [categoryId]: { ...prev[categoryId], saving: true } }));
    await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "link", categoryId, name: form.name, url: form.url, description: form.description }),
    });
    setLinkForms(prev => ({ ...prev, [categoryId]: { name: "", url: "", description: "", saving: false } }));
    fetchCategories();
  }

  async function updateLink(id: number) {
    if (!editLinkData.name.trim() || !editLinkData.url.trim()) return;
    await fetch("/api/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "link", id, name: editLinkData.name, url: editLinkData.url, description: editLinkData.description }),
    });
    setEditingLinkId(null);
    fetchCategories();
  }

  async function deleteItem(id: number, type: "category" | "link") {
    if (!confirm("Are you sure?")) return;
    await fetch("/api/admin/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type }),
    });
    fetchCategories();
  }

  function startEditCategory(cat: ServiceCategory, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingCatId(cat.id);
    setEditCatData({ name: cat.name, icon: cat.icon, type: cat.type, color: cat.color });
  }

  function startEditLink(link: ServiceLink) {
    setEditingLinkId(link.id);
    setEditLinkData({ name: link.name, url: link.url, description: link.description || "" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Service Links</h1>
          <p className="text-gray-400 text-sm mt-1">Manage FTP, Live TV, Apps and other links for your customers</p>
        </div>
        <button
          onClick={() => setShowCatForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neon-blue/20 border border-neon-blue/40 text-neon-blue font-semibold text-sm hover:bg-neon-blue/30 transition-all"
        >
          <FolderPlus size={16} /> Add Category
        </button>
      </div>

      {/* Add Category Form */}
      <AnimatePresence>
        {showCatForm && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="glass-card p-6 border border-neon-blue/20 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">New Category</h3>
              <button onClick={() => setShowCatForm(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Category Name</label>
                <input
                  value={catName} onChange={e => setCatName(e.target.value)}
                  placeholder="e.g. FTP Server, Live TV..."
                  className="w-full p-3 glass-input rounded-xl text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-neon-blue/40"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Type</label>
                <select value={catType} onChange={e => setCatType(e.target.value)}
                  className="w-full p-3 glass-input rounded-xl text-white text-sm border border-white/10 focus:outline-none bg-slate-900/60">
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value} className="bg-slate-800">{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Icon (Emoji)</label>
                <input
                  value={catIcon} onChange={e => setCatIcon(e.target.value)}
                  placeholder="🔗"
                  className="w-full p-3 glass-input rounded-xl text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-neon-blue/40"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Accent Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button key={c} onClick={() => setCatColor(c)}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: catColor === c ? 'white' : 'transparent' }} />
                  ))}
                  <input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={addCategory} disabled={savingCat || !catName.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neon-blue text-black font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                {savingCat ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Category
              </button>
              <button onClick={() => setShowCatForm(false)} className="px-6 py-2.5 rounded-xl glass-button text-gray-300 text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-neon-blue" size={36} />
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-card p-16 text-center rounded-2xl border border-white/5">
          <Link2 size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">No service categories yet</p>
          <p className="text-gray-600 text-sm mt-1">Click "Add Category" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat, i) => {
            const lf = linkForms[cat.id] || { name: "", url: "", description: "", saving: false };
            const isOpen = expanded === cat.id;
            const isEditingCat = editingCatId === cat.id;

            return (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl border overflow-hidden" style={{ borderColor: `${cat.color}30` }}>
                
                {/* Category Header */}
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => !isEditingCat && setExpanded(isOpen ? null : cat.id)}
                >
                  {isEditingCat ? (
                    <div className="flex-1 mr-4 grid grid-cols-1 md:grid-cols-4 gap-3 w-full" onClick={e => e.stopPropagation()}>
                      <input
                        value={editCatData.name} onChange={e => setEditCatData({...editCatData, name: e.target.value})}
                        placeholder="Category Name"
                        className="p-2 glass-input rounded-lg text-white text-sm border border-white/10"
                      />
                      <input
                        value={editCatData.icon} onChange={e => setEditCatData({...editCatData, icon: e.target.value})}
                        placeholder="Icon"
                        className="p-2 glass-input rounded-lg text-white text-sm border border-white/10"
                      />
                      <select value={editCatData.type} onChange={e => setEditCatData({...editCatData, type: e.target.value})}
                        className="p-2 glass-input rounded-lg text-white text-sm border border-white/10 bg-slate-900/60">
                        {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value} className="bg-slate-800">{t.label}</option>)}
                      </select>
                      <input type="color" value={editCatData.color} onChange={e => setEditCatData({...editCatData, color: e.target.value})} className="h-10 w-full rounded cursor-pointer border-0 bg-transparent" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: `${cat.color}22`, border: `1px solid ${cat.color}40` }}>
                        {cat.icon.replace("🔗", "").trim() || cat.icon}
                      </div>
                      <div>
                        <div className="font-bold text-white text-base">{cat.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {TYPE_OPTIONS.find(t => t.value === cat.type)?.label} • {cat.links.length} link{cat.links.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 md:mt-0 justify-end" onClick={e => e.stopPropagation()}>
                    {isEditingCat ? (
                      <>
                        <button onClick={() => updateCategory(cat.id)} className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-all"><Check size={16} /></button>
                        <button onClick={() => setEditingCatId(null)} className="p-2 rounded-lg text-gray-400 hover:bg-white/10 transition-all"><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={(e) => startEditCategory(cat, e)}
                          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteItem(cat.id, "category"); }}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 size={15} />
                        </button>
                        <div className="px-2">{isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Links + Add Form */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-3">
                        
                        {/* Existing links */}
                        {cat.links.map(link => {
                          const isEditingLink = editingLinkId === link.id;
                          return (
                            <div key={link.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                              {isEditingLink ? (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 w-full pr-4">
                                  <input
                                    value={editLinkData.name} onChange={e => setEditLinkData({...editLinkData, name: e.target.value})}
                                    placeholder="Name" className="p-2 glass-input rounded-lg text-white text-sm"
                                  />
                                  <input
                                    value={editLinkData.url} onChange={e => setEditLinkData({...editLinkData, url: e.target.value})}
                                    placeholder="URL" className="p-2 glass-input rounded-lg text-white text-sm"
                                  />
                                  <input
                                    value={editLinkData.description} onChange={e => setEditLinkData({...editLinkData, description: e.target.value})}
                                    placeholder="Description" className="p-2 glass-input rounded-lg text-white text-sm"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <Globe size={15} className="text-gray-500 flex-shrink-0" style={{ color: cat.color }} />
                                  <div className="min-w-0">
                                    <div className="text-white text-sm font-medium truncate">{link.name}</div>
                                    <a href={link.url.startsWith("http") ? link.url : `//${link.url}`} target="_blank" rel="noopener noreferrer"
                                      className="text-xs truncate block hover:underline" style={{ color: cat.color }} onClick={e => e.stopPropagation()}>
                                      {link.url}
                                    </a>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1 mt-3 md:mt-0 flex-shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                {isEditingLink ? (
                                  <>
                                    <button onClick={() => updateLink(link.id)} className="p-2 rounded-lg text-green-400 hover:bg-green-500/10"><Check size={14} /></button>
                                    <button onClick={() => setEditingLinkId(null)} className="p-2 rounded-lg text-gray-400 hover:bg-white/10"><X size={14} /></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => startEditLink(link)} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10"><Edit2 size={13} /></button>
                                    <button onClick={() => deleteItem(link.id, "link")} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Link Form */}
                        <div className="mt-3 p-4 rounded-xl border border-dashed border-white/10 bg-white/3 space-y-3">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Add New Link</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              value={lf.name}
                              onChange={e => setLinkForms(prev => ({ ...prev, [cat.id]: { ...lf, name: e.target.value } }))}
                              placeholder="Link name (e.g. FTP Link)"
                              className="p-2.5 glass-input rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-neon-blue/40"
                            />
                            <input
                              value={lf.url}
                              onChange={e => setLinkForms(prev => ({ ...prev, [cat.id]: { ...lf, url: e.target.value } }))}
                              placeholder="URL or IP (e.g. www.example.com)"
                              className="p-2.5 glass-input rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-neon-blue/40"
                            />
                            <input
                              value={lf.description}
                              onChange={e => setLinkForms(prev => ({ ...prev, [cat.id]: { ...lf, description: e.target.value } }))}
                              placeholder="Description (optional)"
                              className="p-2.5 glass-input rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-neon-blue/40 md:col-span-2"
                            />
                          </div>
                          <button onClick={() => addLink(cat.id)} disabled={lf.saving || !lf.name?.trim() || !lf.url?.trim()}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                            style={{ background: `${cat.color}22`, border: `1px solid ${cat.color}40`, color: cat.color }}>
                            {lf.saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Add Link
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
