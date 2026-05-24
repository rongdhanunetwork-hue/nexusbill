"use client";

import Link from "next/link";
import { RefreshCcw, Home } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-5 text-2xl">!</div>
        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-gray-400 mb-6">The page could not load. Please refresh or go back home.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-4 py-2 rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/30 inline-flex items-center gap-2">
            <RefreshCcw size={16} /> Retry
          </button>
          <Link href="/" className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 inline-flex items-center gap-2">
            <Home size={16} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
