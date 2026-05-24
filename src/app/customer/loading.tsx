export default function CustomerLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="glass-card p-8 text-center max-w-sm w-full">
        <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-semibold">Loading Customer Panel...</p>
        <p className="text-gray-400 text-sm mt-2">Your account details are loading</p>
      </div>
    </div>
  );
}
