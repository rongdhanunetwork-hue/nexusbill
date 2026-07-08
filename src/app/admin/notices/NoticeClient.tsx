"use client";

import { useState, useRef, useEffect } from "react";
import { Megaphone, Wrench, Gift, Send, Trash2, Image as ImageIcon, Loader2, Edit2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePopup } from "@/components/ui/PopupProvider";

export default function NoticeClient({ notices }: { notices: any[] }) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showConfirm, showAlert } = usePopup();
  
  const titleRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const iconForType = (type: string | null) => {
    if (type === "offer") return <Gift size={18} className="text-neon-green" />;
    if (type === "maintenance") return <Wrench size={18} className="text-orange-400" />;
    return <Megaphone size={18} className="text-neon-blue" />;
  };

  const handleEdit = (notice: any) => {
    setEditingId(notice.id);
    if (titleRef.current) titleRef.current.value = notice.title || "";
    if (messageRef.current) messageRef.current.value = notice.message || "";
    if (typeRef.current) typeRef.current.value = notice.type || "general";
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    if (formRef.current) formRef.current.reset();
    setImageFile(null);
  };

  const handlePublish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPublishing(true);
    
    const formD = new FormData(e.currentTarget);
    let imageUrl = "";

    try {
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success) {
          imageUrl = uploadJson.url;
        }
      } else if (editingId) {
         // Keep existing image if no new image is selected during edit
         const existingNotice = notices.find(n => n.id === editingId);
         if (existingNotice && existingNotice.imageUrl) {
             imageUrl = existingNotice.imageUrl;
         }
      }

      const noticeData = {
        title: formD.get("title")?.toString().trim(),
        message: formD.get("message")?.toString().trim(),
        type: formD.get("type")?.toString() || "general",
        imageUrl,
      };

      const url = editingId ? `/api/admin/notices/${editingId}` : "/api/admin/notices";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeData)
      });

      if (res.ok) {
        setImageFile(null);
        setEditingId(null);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        await showAlert({ title: "Failed", message: editingId ? "Failed to update notice." : "Failed to publish notice.", type: "error" });
      }
    } catch (err) {
      await showAlert({ title: "Error", message: "An error occurred.", type: "error" });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (id: number) => {
    const isConfirm = await showConfirm({
      title: "Delete Notice",
      message: "Are you sure you want to delete this notice? It will disappear from all customer portals.",
      danger: true,
      confirmText: "Delete"
    });
    if (!isConfirm) return;
    
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/notices/" + id, { 
        method: "DELETE",
      });
      if (res.ok) {
        window.location.reload();
      } else {
        await showAlert({ title: "Failed", message: "Failed to delete notice.", type: "error" });
      }
    } catch (err) {
      await showAlert({ title: "Error", message: "An error occurred while deleting.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid xl:grid-cols-2 gap-8">
      <div className="space-y-6 overflow-hidden">
        <h1 className="text-2xl font-bold text-white tracking-wide">Notice System</h1>
        <form ref={formRef} onSubmit={handlePublish} className="glass-card p-6 md:p-8 space-y-5 overflow-hidden relative">
          {editingId && (
            <div className="absolute top-0 left-0 w-full bg-blue-500/20 text-blue-300 text-sm py-2 px-6 flex justify-between items-center">
              <span>Editing Notice #{editingId}</span>
              <button type="button" onClick={handleCancelEdit} className="hover:text-white"><X size={16} /></button>
            </div>
          )}
          <div className={editingId ? "pt-4" : ""}>
            <label className="block text-sm text-gray-300 mb-2">Notice Type</label>
            <select ref={typeRef} name="type" className="w-full glass-input px-4 py-3 bg-slate-800">
              <option value="general" className="bg-slate-800">Send Notice</option>
              <option value="offer" className="bg-slate-800">Offer Banner</option>
              <option value="maintenance" className="bg-slate-800">Maintenance Notice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Title</label>
            <input ref={titleRef} name="title" required className="w-full glass-input px-4 py-3 bg-slate-800" placeholder="e.g. Eid Offer / Maintenance Tonight" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Message</label>
            <textarea ref={messageRef} name="message" required rows={4} className="w-full glass-input px-4 py-3 bg-slate-800 resize-none" placeholder="Write your notice message..." />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Attach Image (Optional)</label>
            <div className="w-full glass-input px-4 py-3 bg-slate-800 flex items-center gap-3 overflow-hidden">
              <ImageIcon size={18} className="text-gray-400 shrink-0" />
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-300 w-full max-w-full overflow-hidden text-ellipsis file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20"
              />
            </div>
            {imageFile && (
              <p className="text-xs text-neon-green mt-2">Selected: {imageFile.name}</p>
            )}
            {editingId && notices.find(n => n.id === editingId)?.imageUrl && !imageFile && (
              <p className="text-xs text-blue-400 mt-2">Current image will be kept. Upload a new one to replace.</p>
            )}
          </div>
          <button disabled={isPublishing} className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold flex items-center justify-center gap-2 hover:bg-neon-blue/30 disabled:opacity-50">
            {isPublishing ? <Loader2 size={18} className="animate-spin" /> : (editingId ? <Edit2 size={18} /> : <Send size={18} />)} 
            {isPublishing ? (editingId ? "Updating..." : "Publishing...") : (editingId ? "Update Notice" : "Publish Notice")}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white tracking-wide">Published Notices</h2>
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">No notices published yet.</div>
          ) : notices.map((notice) => (
            <div key={notice.id} className="glass-card p-5 relative overflow-hidden group">
              <div className="flex items-start gap-3 relative z-10">
                <div className="p-2 bg-white/10 rounded-lg">{iconForType(notice.type)}</div>
                <div className="flex-1 pr-16">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h3 className="font-bold text-white">{notice.title}</h3>
                    <span className="text-xs text-gray-500 capitalize">{notice.type}</span>
                  </div>
                  {notice.imageUrl && (
                    <div className="my-3">
                      <img src={notice.imageUrl} alt="Notice Image" className="max-h-32 rounded-lg object-cover border border-white/10" />
                    </div>
                  )}
                  <p className="text-gray-400 text-sm leading-relaxed">{notice.message}</p>
                  <p className="text-xs text-gray-500 mt-3">{new Date(notice.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button 
                  type="button"
                  onClick={() => handleEdit(notice)}
                  className="p-2 bg-blue-500/10 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all"
                  title="Edit Notice"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  type="button"
                  onClick={() => handleDelete(notice.id)}
                  disabled={deletingId === notice.id}
                  className="p-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-all opacity-100 disabled:opacity-50"
                  title="Delete Notice"
                >
                  {deletingId === notice.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
