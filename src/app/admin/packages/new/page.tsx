import { db } from "@/db";
import { packages } from "@/db/schema";
import { redirect } from "next/navigation";

async function createPackage(formData: FormData) {
  "use server";
  await db.insert(packages).values({
    name: String(formData.get("name") || ""),
    speed: String(formData.get("speed") || "10 Mbps"),
    price: String(formData.get("price") || "0"),
    durationDays: Number(formData.get("durationDays")) || 30,
  });
  redirect("/admin/packages");
}

export default function CreatePackagePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white tracking-wide">Create Package</h1>
      <form action={createPackage} className="glass-card p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Package Name</label>
          <input name="name" required placeholder="Basic / Pro / Premium" className="w-full glass-input px-4 py-3 bg-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Speed</label>
          <select name="speed" className="w-full glass-input px-4 py-3 bg-slate-800">
            <option className="bg-slate-800">10 Mbps</option>
            <option className="bg-slate-800">20 Mbps</option>
            <option className="bg-slate-800">30 Mbps</option>
            <option className="bg-slate-800">50 Mbps</option>
            <option className="bg-slate-800">100 Mbps</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Price</label>
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
