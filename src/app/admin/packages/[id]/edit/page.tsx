import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { packages, users } from "@/db/schema";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

async function editPackage(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "employee")) redirect("/login");

  let adminId = session.userId;
  if (session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/packages");

  const selectedSpeed = String(formData.get("speed_preset") || "");
  const customSpeed = String(formData.get("speed_custom") || "").trim();
  const finalSpeed = customSpeed.length > 0 ? customSpeed : (selectedSpeed || "10 Mbps");
  const dataLimitStr = formData.get("dataLimitGb");
  const dataLimitGb = dataLimitStr ? Number(dataLimitStr) : null;

  await db.update(packages)
    .set({
      name: String(formData.get("name") || ""),
      speed: finalSpeed,
      price: String(formData.get("price") || "0"),
      durationDays: Number(formData.get("durationDays")) || 30,
      dataLimitGb,
    })
    .where(and(eq(packages.id, id), eq(packages.adminId, adminId)));
    
  redirect("/admin/packages");
}

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "employee")) redirect("/login");

  let adminId = session.userId;
  if (session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  const { id } = await params;
  const pkgId = parseInt(id);

  if (isNaN(pkgId)) redirect("/admin/packages");

  const pkg = await db.query.packages.findFirst({
    where: and(eq(packages.id, pkgId), eq(packages.adminId, adminId))
  });

  if (!pkg) {
    redirect("/admin/packages");
  }

  const isPreset = ["5 Mbps", "10 Mbps", "15 Mbps", "20 Mbps", "30 Mbps", "50 Mbps", "75 Mbps", "100 Mbps", "150 Mbps", "200 Mbps"].includes(pkg.speed);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/packages" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-wide">Edit Package</h1>
      </div>
      <form action={editPackage} className="glass-card p-6 md:p-8 space-y-5">
        <input type="hidden" name="id" value={pkg.id} />
        <div>
          <label className="block text-sm text-gray-300 mb-2">Package Name</label>
          <input name="name" defaultValue={pkg.name} required placeholder="Basic / Pro / Premium" className="w-full glass-input px-4 py-3 bg-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Speed (Preset)</label>
          <select name="speed_preset" defaultValue={isPreset ? pkg.speed : ""} className="w-full glass-input px-4 py-3 bg-slate-800">
            <option className="bg-slate-800" value="">Select Preset</option>
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
            defaultValue={!isPreset ? pkg.speed : ""}
            placeholder="Leave blank to use preset above"
            className="w-full glass-input px-4 py-3 bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Price (৳)</label>
          <input name="price" type="number" defaultValue={pkg.price} required placeholder="500" className="w-full glass-input px-4 py-3 bg-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Expire/Duration Days</label>
          <input name="durationDays" type="number" defaultValue={pkg.durationDays ?? ""} className="w-full glass-input px-4 py-3 bg-slate-800" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Data Limit (GB) - Leave blank for Unlimited FUP</label>
          <input name="dataLimitGb" type="number" defaultValue={pkg.dataLimitGb || ""} placeholder="e.g. 500" className="w-full glass-input px-4 py-3 bg-slate-800" />
        </div>
        <button className="w-full py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold hover:bg-neon-blue/30">Update Package</button>
      </form>
    </div>
  );
}
