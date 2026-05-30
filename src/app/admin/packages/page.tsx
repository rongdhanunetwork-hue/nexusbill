import { db } from "@/db";
import { packages } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Plus, Trash, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

async function deletePackage(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (id) await db.delete(packages).where(eq(packages.id, id));
  revalidatePath("/admin/packages");
}

export default async function PackagesPage() {
  const allPackages = await db.query.packages.findMany({ orderBy: [desc(packages.createdAt)] });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-wide">Package Management</h1>
        <Link href="/admin/packages/new" className="bg-neon-blue/20 text-neon-blue border border-neon-blue/50 px-4 py-2 rounded-lg font-medium hover:bg-neon-blue/30 flex items-center gap-2"><Plus size={20} /> Create Package</Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allPackages.length === 0 ? (
          <div className="col-span-full p-8 text-center glass-card text-gray-500">No packages found.</div>
        ) : allPackages.map((pkg) => (
          <div key={pkg.id} className="glass-card overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-6 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-neon-blue/20 text-neon-blue flex items-center justify-center mb-4"><Zap size={24} /></div>
              <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
              <div className="text-sm text-gray-400 mt-1">Speed: {pkg.speed}</div>
              <div className="text-4xl font-bold text-neon-blue mt-5">৳{pkg.price}</div>
              <div className="text-xs text-gray-500 mt-1">Expire/Duration: {pkg.durationDays} days</div>
              <div className="text-xs text-gray-400 mt-1">Data Limit (FUP): {pkg.dataLimitGb ? `${pkg.dataLimitGb} GB` : "Unlimited"}</div>
            </div>
            <div className="bg-white/5 px-6 py-3 flex justify-end gap-3 relative z-10">
              <form action={deletePackage}>
                <input type="hidden" name="id" value={pkg.id} />
                <button className="text-gray-400 hover:text-red-400 flex items-center gap-1 text-sm font-medium"><Trash size={16} /> Delete</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
