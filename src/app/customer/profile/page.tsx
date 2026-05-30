import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { User, Phone, MapPin, Wifi, Package, CreditCard } from "lucide-react";
import Link from "next/link";
import TwoFactorUI from "./TwoFactorUI";

export const dynamic = "force-dynamic";

export default async function CustomerProfile() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    redirect("/login/customer");
  }

  const customer = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: { package: true },
  });

  if (!customer) {
    redirect("/login/customer");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white tracking-wide">My Profile</h1>

      <div className="glass-card p-8">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-neon-green to-teal-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-neon-green/30 overflow-hidden shrink-0">
            {customer.photoUrl ? (
              <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover" />
            ) : (
              customer.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
            <p className="text-gray-400 text-sm">Customer since {customer.createdAt?.toLocaleDateString()}</p>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold mt-1 inline-block ${customer.status === "active" || customer.status === "online" ? "bg-neon-green/20 text-neon-green" : "bg-red-500/20 text-red-400"}`}>
              {customer.status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <InfoCard icon={<Phone size={18} className="text-neon-blue" />} label="Phone" value={customer.phone} />
          <InfoCard icon={<MapPin size={18} className="text-neon-green" />} label="Address" value={customer.address || "Not set"} />
          <InfoCard icon={<Package size={18} className="text-purple-400" />} label="Package" value={`${customer.package?.name || "None"} (${customer.package?.speed || "N/A"})`} />
          <InfoCard icon={<Wifi size={18} className="text-teal-400" />} label="PPPoE Username" value={customer.pppoeUsername || "Not assigned"} />
          <InfoCard icon={<CreditCard size={18} className="text-orange-400" />} label="Expire Date" value={customer.expireDate ? new Date(customer.expireDate).toLocaleDateString() : "N/A"} />
          <InfoCard icon={<User size={18} className="text-pink-400" />} label="NID" value={customer.nidUrl ? "Uploaded" : "Not uploaded"} />
        </div>
      </div>

      <TwoFactorUI is2FAEnabled={!!customer.twoFactorEnabled} />

    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-white font-medium text-sm">{value}</p>
      </div>
    </div>
  );
}
