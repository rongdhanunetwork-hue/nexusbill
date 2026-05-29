import { Shield, ShieldAlert } from "lucide-react";

export default function EmployeeSettingsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-white tracking-wide">Employee Settings</h1>

      <div className="glass-card p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-4 flex items-center gap-2">
          <Shield size={18} className="text-orange-400" /> Account Security settings
        </h2>
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm flex gap-3 text-orange-300">
          <ShieldAlert size={20} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white mb-1">Configuration Locked</h4>
            <p className="leading-relaxed">As a restricted staff member, password modifications and system setting edits have been locked. Please contact the network administrator for updates.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
