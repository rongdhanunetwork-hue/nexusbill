"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Edit2,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  HelpCircle
} from "lucide-react";

interface SmsTemplate {
  id: number;
  key: string;
  template: string;
  description: string | null;
}

export default function SmsTemplatesPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sms-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0) {
          selectTemplate(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function selectTemplate(t: SmsTemplate) {
    setSelectedTemplate(t);
    setTemplateContent(t.template);
    setTemplateDescription(t.description || "");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;

    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/admin/sms-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedTemplate.key,
          template: templateContent,
          description: templateDescription,
        }),
      });

      if (res.ok) {
        setSaveStatus("success");
        // Update local list
        setTemplates((prev) =>
          prev.map((t) =>
            t.key === selectedTemplate.key
              ? { ...t, template: templateContent, description: templateDescription }
              : t
          )
        );
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  function insertPlaceholder(placeholder: string) {
    setTemplateContent((prev) => prev + placeholder);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={40} className="animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
          <MessageSquare className="text-neon-blue" /> SMS Template Configurations
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          বিভিন্ন ঘটনা বা বিজ্ঞপ্তির জন্য স্বয়ংক্রিয়ভাবে পাঠানো SMS এর বার্তা কাস্টমাইজ করুন।
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Templates List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-4 flex items-center justify-between border-b border-white/5">
            <span className="font-semibold text-white">Templates List</span>
            <button
              onClick={fetchTemplates}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5 transition-colors"
              title="Reload Templates"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {templates.map((t) => {
              const isSelected = selectedTemplate?.key === t.key;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`w-full text-left p-4 rounded-xl transition-all border flex flex-col gap-1 ${
                    isSelected
                      ? "bg-neon-blue/10 border-neon-blue/40 text-white shadow-[inset_0_0_20px_rgba(0,243,255,0.05)]"
                      : "bg-slate-900/40 border-white/5 text-gray-400 hover:border-white/10 hover:bg-slate-900/60 hover:text-white"
                  }`}
                >
                  <span className={`font-semibold text-sm ${isSelected ? "text-neon-blue" : "text-white"}`}>
                    {t.key.toUpperCase().replace(/_/g, " ")}
                  </span>
                  <span className="text-xs line-clamp-1 opacity-70">
                    {t.description || "No description provided."}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor Form */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <form onSubmit={handleSave} className="glass-card p-6 md:p-8 space-y-6">
              <div className="border-b border-white/10 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-white uppercase tracking-wider">
                    Edit: {selectedTemplate.key.replace(/_/g, " ")}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Template Key: <code className="text-neon-blue">{selectedTemplate.key}</code>
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-400 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-yellow-400 animate-pulse" /> Custom Template
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Description</label>
                <input
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Enter a description for this template..."
                  className="w-full glass-input px-4 py-3 bg-slate-950/40 text-white border border-white/10 focus:border-neon-blue/50 rounded-xl"
                />
              </div>

              {/* Template Content */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Template Text</label>
                <textarea
                  rows={6}
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="আপনার SMS এর মূল বডি এখানে লিখুন..."
                  className="w-full glass-input p-4 bg-slate-950/40 text-white border border-white/10 focus:border-neon-blue/50 rounded-xl font-mono text-sm leading-relaxed focus:outline-none"
                  required
                />
              </div>

              {/* Quick Placeholders */}
              <div className="space-y-3 bg-slate-950/60 border border-white/5 p-4 rounded-xl">
                <span className="text-xs font-semibold text-gray-300 uppercase flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-neon-blue" /> Click placeholders to insert:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{name}")}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {"{name}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{amount}")}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {"{amount}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{expire_date}")}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {"{expire_date}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{due_date}")}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {"{due_date}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder("{contact}")}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {"{contact}"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 leading-normal">
                  * Note: SMS পাঠানোর সময় সিস্টেম স্বয়ংক্রিয়ভাবে bracket placeholders গুলোকে সংশ্লিষ্ট তথ্যের সাথে প্রতিস্থাপন করবে।
                </p>
              </div>

              {/* Status Alert */}
              <AnimatePresence>
                {saveStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
                      saveStatus === "success"
                        ? "bg-neon-green/10 border-neon-green/30 text-neon-green"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}
                  >
                    {saveStatus === "success" ? (
                      <>
                        <CheckCircle2 size={16} /> Template successfully saved!
                      </>
                    ) : (
                      "Failed to save template. Please try again."
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/30 font-semibold hover:bg-neon-blue/30 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Saving Template...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Save Template Configuration
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="glass-card p-12 text-center text-gray-400">
              Select a template from the list to start editing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
