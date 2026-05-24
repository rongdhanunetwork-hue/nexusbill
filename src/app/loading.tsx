export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="glass-card p-8 text-center">
        <div className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-semibold">Loading NexusBill ISP...</p>
        <p className="text-sm text-gray-400 mt-2">Please wait a moment</p>
      </div>
    </div>
  );
}
