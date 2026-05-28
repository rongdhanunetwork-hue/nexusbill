import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { redirect } from "next/navigation";

async function createPackage(formData: FormData) {
  "use server";
  const selectedSpeed = String(formData.get("speed_preset") || "");
  const customSpeed = String(formData.get("speed_custom") || "").trim();
  // If user entered a custom speed, use it; otherwise use the preset
  const finalSpeed = customSpeed.length > 0 ? customSpeed : (selectedSpeed || "10 Mbps");

  await db.insert(packages).values({
    name: String(formData.get("name") || ""),
    speed: finalSpeed,
    price: String(formData.get("price") || "0"),
    durationDays: Number(formData.get("durationDays")) || 30,
  });
  redirect("/admin/packages");
}

export default function CreatePackagePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/packages" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-wide">Create Package</h1>
      </div>
      <form action={createPackage} className="glass-card p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Package Name</label>
          <input name="name" required placeholder="Basic / Pro / Premium" className="w-full glass-input px-4 py-3 bg-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Speed (Preset)</label>
          <select name="speed_preset" className="w-full glass-input px-4 py-3 bg-slate-800">
            <option className="bg-slate-800" value="5 Mbps">5 Mbps</option>
            <option className="bg-slate-800" value="10 Mbps">10 Mbps</option>
            <option className="bg-slate-800" value="15 Mbps">15 Mbps</option>
            <option className="bg-slate-800" value="20 Mbps">20 Mbps</option>
            <option className="bg-slate-800" value="30 Mbps">30 Mbps</option>
            <option className="bg-slate-800" value="50 Mbps">50 Mbps</option>
            <option className="bg-slate-800" value="75 Mbps">75 Mbps</option>
            <option className="bg-slate-800" value="100 Mbps">100 Mbps</option>
            <option className="bg-slate-800" value="150 Mbps">150 Mbps</option>
            <option className="bg-slate-800" value="200 Mbps">200 Mbps</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">অথবা নিচে কাস্টম স্পিড লিখুন (লিখলে উপরেরটা উপেক্ষিত হবে)</p>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Custom Speed (optional — e.g. 512Kbps, 2 Mbps, 500 Mbps)</label>
          <input
            name="speed_custom"
            placeholder="Leave blank to use preset above"
            className="w-full glass-input px-4 py-3 bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Price (৳)</label>
          <input name="price" type="number" required placeholder="500" className="w-full glass-input px-4 py-3 bg-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Expire/Duration Days</label>
          <input name="durationDays" type="number" defaultValue={30} className="w-full glass-input px-4 py-3 bg-slate-800" />
        </div>
        <button className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold hover:bg-neon-blue/30">Save Package</button>
      </form>
    </div>
  );
}
