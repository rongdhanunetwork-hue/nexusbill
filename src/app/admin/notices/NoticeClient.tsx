"use client";

import { useState } from "react";
import { Megaphone, Wrench, Gift, Send, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePopup } from "@/components/ui/PopupProvider";

export default function NoticeClient({ notices }: { notices: any[] }) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { showConfirm, showAlert } = usePopup();

  const iconForType = (type: string | null) => {
    if (type === "offer") return <Gift size={18} className="text-neon-green" />;
    if (type === "maintenance") return <Wrench size={18} className="text-orange-400" />;
    return <Megaphone size={18} className="text-neon-blue" />;
  };

  const handlePublish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPublishing(true);
    
    const formData = new FormData(e.currentTarget);
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
      }

      const noticeData = {
        title: formData.get("title")?.toString().trim(),
        message: formData.get("message")?.toString().trim(),
        type: formData.get("type")?.toString() || "general",
        imageUrl,
      };

      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeData)
      });

      if (res.ok) {
        setImageFile(null);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        await showAlert({ title: "Failed", message: "Failed to publish notice.", type: "error" });
      }
    } catch (err) {
      await showAlert({ title: "Error", message: "An error occurred while publishing.", type: "error" });
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
      const res = await fetch("/api/admin/notices", { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
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
        <form onSubmit={handlePublish} className="glass-card p-6 md:p-8 space-y-5 overflow-hidden">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Notice Type</label>
            <select name="type" className="w-full glass-input px-4 py-3 bg-slate-800">
              <option value="general" className="bg-slate-800">Send Notice</option>
              <option value="offer" className="bg-slate-800">Offer Banner</option>
              <option value="maintenance" className="bg-slate-800">Maintenance Notice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Title</label>
            <input name="title" required className="w-full glass-input px-4 py-3 bg-slate-800" placeholder="e.g. Eid Offer / Maintenance Tonight" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Message</label>
            <textarea name="message" required rows={4} className="w-full glass-input px-4 py-3 bg-slate-800 resize-none" placeholder="Write your notice message..." />
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
          </div>
          <button disabled={isPublishing} className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold flex items-center justify-center gap-2 hover:bg-neon-blue/30 disabled:opacity-50">
            {isPublishing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 
            {isPublishing ? "Publishing..." : "Publish Notice"}
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
                <div className="flex-1 pr-8">
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
              <button 
                type="button"
                onClick={() => handleDelete(notice.id)}
                disabled={deletingId === notice.id}
                className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-all opacity-100 disabled:opacity-50 z-20"
                title="Delete Notice"
              >
                {deletingId === notice.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
