"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LifeBuoy, MessageSquare, Loader2, Clock, AlertTriangle, Eye
} from "lucide-react";

interface Ticket {
  id: number;
  userId: number;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  user?: {
    name: string;
    phone: string;
  };
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

export default function EmployeeTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Conversation states
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tickets");
      const data = await res.json();
      if (Array.isArray(data)) setTickets(data);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setRepliesLoading(true);
    try {
      const res = await fetch(`/api/customer/ticket/${ticket.id}`);
      const data = await res.json();
      if (data.replies) setReplies(data.replies);
    } catch (err) {
      console.error("Error loading conversation:", err);
    } finally {
      setRepliesLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
        <LifeBuoy className="text-orange-400 animate-pulse" /> Support Tickets (Read-Only)
      </h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={40} className="animate-spin text-orange-400" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tickets List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h2 className="font-semibold text-white">Tickets ({tickets.length})</h2>
              </div>
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageSquare size={32} className="mx-auto mb-2 text-gray-600" />
                    No tickets found.
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket)}
                      className={`w-full text-left p-4 hover:bg-white/5 transition-colors block ${
                        selectedTicket?.id === ticket.id ? "bg-white/10 border-l-2 border-orange-400" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-white text-sm truncate max-w-[140px]">
                          {ticket.user?.name || "Unknown User"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                            ticket.status === "open"
                              ? "bg-red-500/20 text-red-400 border border-red-500/20"
                              : "bg-orange-500/20 text-orange-350 border border-orange-500/20"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-xs text-orange-350 font-semibold truncate mb-1">{ticket.subject}</p>
                      <p className="text-xs text-gray-400 truncate mb-2">{ticket.message}</p>
                      <span className="text-[10px] text-gray-500">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ticket Conversation Detail */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card flex flex-col h-[600px]"
              >
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">{selectedTicket.subject}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      From: <span className="text-white font-medium">{selectedTicket.user?.name}</span> ({selectedTicket.user?.phone})
                    </p>
                  </div>
                  <div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      selectedTicket.status === "open"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-orange-500/20 text-orange-350 border border-orange-450/30"
                    }`}>
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar bg-slate-950/20">
                  {/* Original Message */}
                  <div className="flex justify-start">
                    <div className="glass-card max-w-[80%] p-4 border border-orange-500/20 bg-orange-500/5">
                      <p className="text-xs text-orange-350 font-bold mb-1">Customer Original Message</p>
                      <p className="text-sm text-white whitespace-pre-wrap">{selectedTicket.message}</p>
                      <span className="text-[10px] text-gray-500 block mt-2">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Replies list */}
                  {repliesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={24} className="animate-spin text-orange-400" />
                    </div>
                  ) : (
                    replies.map((reply) => {
                      const isSelf = reply.userId !== selectedTicket.userId;
                      return (
                        <div key={reply.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`glass-card max-w-[80%] p-4 border ${
                              isSelf
                                ? "border-orange-500/20 bg-orange-500/5 text-right"
                                : "border-white/10 bg-white/5"
                            }`}
                          >
                            <p className={`text-xs font-bold mb-1 ${isSelf ? "text-orange-350" : "text-emerald-400"}`}>
                              {isSelf ? "Support Agent" : "Customer"}
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

                {/* Reply Form Footer - Disabled for Employee */}
                <div className="p-4 border-t border-white/10 bg-white/5 text-center text-gray-400 text-sm font-semibold flex items-center justify-center gap-2">
                  <Eye size={16} className="text-orange-400" /> Read-only mode. You cannot reply or change status.
                </div>
              </motion.div>
            ) : (
              <div className="glass-card h-[600px] flex items-center justify-center text-center text-gray-500">
                <div>
                  <MessageSquare size={48} className="mx-auto mb-3 text-gray-600 animate-bounce" />
                  <h3 className="font-bold text-white text-lg">No Ticket Selected</h3>
                  <p className="text-sm mt-1">Select a support ticket from the sidebar to view conversation.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
