"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, LifeBuoy, CheckCircle2, MessageSquare, Loader2, Plus, Clock, ChevronRight, ArrowLeft, AlertCircle
} from "lucide-react";

interface Ticket {
  id: number;
  userId: number;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

interface Reply {
  id: number;
  ticketId: number;
  userId: number;
  message: string;
  createdAt: string;
  user?: {
    name: string;
    role: string;
  };
}

export default function SupportPage() {
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Detail view states
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Create ticket states
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/ticket");
      const data = await res.json();
      if (Array.isArray(data)) setTickets(data);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setView("detail");
    setRepliesLoading(true);
    try {
      const res = await fetch(`/api/customer/ticket/${ticket.id}`);
      const data = await res.json();
      if (data.replies) setReplies(data.replies);
    } catch (err) {
      console.error("Error loading replies:", err);
    } finally {
      setRepliesLoading(false);
    }
  }

  async function handleCreateTicket(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const subject = String(form.get("subject") || "");
    const message = String(form.get("message") || "").trim();

    if (!subject || !message) {
      setCreateError("Subject and message are required.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/customer/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      if (res.ok) {
        const newTicket = await res.json();
        setTickets((prev) => [newTicket, ...prev]);
        setView("list");
        handleSelectTicket(newTicket);
      } else {
        const d = await res.json();
        setCreateError(d.error || "Failed to create ticket");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/customer/ticket/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        const newReply = await res.json();
        setReplies((prev) => [...prev, newReply]);
        setReplyText("");
        // Reload detail
        handleSelectTicket(selectedTicket);
      }
    } catch (err) {
      console.error("Error submitting reply:", err);
    } finally {
      setSendingReply(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <LifeBuoy className="text-neon-green" /> Customer Support Center
        </h1>
        {view === "list" && (
          <button
            onClick={() => {
              setView("create");
              setCreateError(null);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/30 text-sm hover:bg-neon-green/30 transition-colors font-semibold"
          >
            <Plus size={16} /> Open Ticket
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* List View */}
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-neon-green" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="glass-card p-12 text-center text-gray-500 border border-white/5">
                <MessageSquare size={48} className="mx-auto mb-3 text-gray-600" />
                <h3 className="text-white font-semibold text-lg">No Support Tickets</h3>
                <p className="text-sm mt-1 mb-6">কোনো অভিযোগ বা জিজ্ঞাসা থাকলে একটি Support Ticket ওপেন করুন।</p>
                <button
                  onClick={() => setView("create")}
                  className="glass-button px-6 py-2.5 text-neon-green border-neon-green/30"
                >
                  Create First Ticket
                </button>
              </div>
            ) : (
              <div className="glass-card divide-y divide-white/5 overflow-hidden">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className="w-full p-5 hover:bg-white/5 flex items-center justify-between text-left transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="font-bold text-white text-base">{ticket.subject}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            ticket.status === "open"
                              ? "bg-red-500/20 text-red-400 border-red-500/20"
                              : "bg-neon-green/20 text-neon-green border-neon-green/20"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 max-w-lg truncate">{ticket.message}</p>
                      <span className="text-[10px] text-gray-500 mt-2 block">
                        Open on: {new Date(ticket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-gray-500" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Create Ticket View */}
        {view === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6 md:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setView("list")} className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-white">Create Support Ticket</h2>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject / Topic</label>
                <select name="subject" className="w-full glass-input px-4 py-3 bg-slate-800 text-white">
                  <option value="Internet Connection Issue" className="bg-slate-800">Internet Connection Issue</option>
                  <option value="Billing Issue" className="bg-slate-800">Billing and Recharge Issue</option>
                  <option value="Slow Speed" className="bg-slate-800">Slow Speed / Bandwidth Issue</option>
                  <option value="Router Configuration" className="bg-slate-800">Router Configuration</option>
                  <option value="Other Complaint" className="bg-slate-800">Other Complaint</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Describe Your Complaint</label>
                <textarea
                  name="message"
                  rows={5}
                  required
                  className="w-full glass-input px-4 py-3 bg-slate-800 text-white resize-none"
                  placeholder="আপনার সমস্যার বিবরণ বিস্তারিত লিখুন..."
                />
              </div>

              {createError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  <AlertCircle size={16} />
                  {createError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Submit Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-6 py-3 bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Conversation / Detail View */}
        {view === "detail" && selectedTicket && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card flex flex-col h-[600px]"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
              <button onClick={() => setView("list")} className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate text-base">{selectedTicket.subject}</h3>
                <span className="text-[10px] text-gray-500">
                  Ticket #{selectedTicket.id} — Status: {selectedTicket.status}
                </span>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase border ${
                  selectedTicket.status === "open"
                    ? "bg-red-500/20 text-red-400 border-red-500/20 shadow-red-500/5"
                    : "bg-neon-green/20 text-neon-green border-neon-green/20 shadow-neon-green/5"
                }`}
              >
                {selectedTicket.status}
              </span>
            </div>

            {/* Conversation Thread */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar bg-slate-950/25">
              {/* Original complaint */}
              <div className="flex justify-end">
                <div className="glass-card max-w-[85%] p-4 border border-neon-green/20 bg-neon-green/5 text-right">
                  <p className="text-xs text-neon-green font-bold mb-1">Your Complaint</p>
                  <p className="text-sm text-white text-left whitespace-pre-wrap">{selectedTicket.message}</p>
                  <span className="text-[10px] text-gray-500 block mt-2 text-left">
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Replies list */}
              {repliesLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={24} className="animate-spin text-neon-green" />
                </div>
              ) : (
                replies.map((reply) => {
                  const isSelf = reply.userId === selectedTicket.userId;
                  return (
                    <div key={reply.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`glass-card max-w-[85%] p-4 border ${
                          isSelf
                            ? "border-neon-green/20 bg-neon-green/5 text-right"
                            : "border-purple-500/20 bg-purple-500/5"
                        }`}
                      >
                        <p className={`text-xs font-bold mb-1 ${isSelf ? "text-neon-green" : "text-purple-400"}`}>
                          {isSelf ? "You" : "Support Agent (Admin)"}
                        </p>
                        <p className="text-sm text-white whitespace-pre-wrap text-left">{reply.message}</p>
                        <span className="text-[10px] text-gray-500 block mt-2 text-left">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Footer */}
            {selectedTicket.status === "open" ? (
              <form onSubmit={handleSendReply} className="p-4 border-t border-white/10 bg-white/5 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your message reply here..."
                  className="flex-1 glass-input px-4 py-3 bg-slate-900 text-white text-sm"
                  disabled={sendingReply}
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-5 py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30 transition-colors font-bold disabled:opacity-50 flex items-center justify-center shrink-0"
                >
                  {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            ) : (
              <div className="p-5 border-t border-white/10 bg-red-500/5 text-center text-red-400 text-sm font-semibold flex items-center justify-center gap-2">
                <AlertCircle size={16} /> এই টিকিটটি ক্লোজ করা হয়েছে। আপনার কোনো সমস্যা থাকলে নতুন টিকেট ওপেন করুন।
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
