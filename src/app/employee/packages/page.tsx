import { db } from "@/db";
import { packages } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeePackagesPage() {
  const allPackages = await db.query.packages.findMany({ orderBy: [desc(packages.createdAt)] });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-wide">Internet Packages</h1>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allPackages.length === 0 ? (
          <div className="col-span-full p-8 text-center glass-card text-gray-500">No packages found.</div>
        ) : allPackages.map((pkg) => (
          <div key={pkg.id} className="glass-card overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-6 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-300 flex items-center justify-center mb-4"><Zap size={24} /></div>
              <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
              <div className="text-sm text-gray-400 mt-1">Speed: {pkg.speed}</div>
              <div className="text-4xl font-bold text-orange-300 mt-5">৳{pkg.price}</div>
              <div className="text-xs text-gray-500 mt-1">Expire/Duration: {pkg.durationDays} days</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
