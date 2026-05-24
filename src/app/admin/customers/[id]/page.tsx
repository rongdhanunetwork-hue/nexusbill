import { db } from "@/db";
import { users, payments, invoices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Phone, MapPin, Wifi, Package, CreditCard, Image, IdCard } from "lucide-react";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  const customer = await db.query.users.findFirst({
    where: eq(users.id, customerId),
    with: { package: true, mikrotik: true }
  });
  if (!customer) notFound();

  const customerPayments = await db.query.payments.findMany({ where: eq(payments.userId, customerId), orderBy: [desc(payments.createdAt)], limit: 8 });
  const customerInvoices = await db.query.invoices.findMany({ where: eq(invoices.userId, customerId), orderBy: [desc(invoices.createdAt)], limit: 8 });

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-wide">Customer Profile</h1>
        <Link href={`/admin/customers/${customer.id}/edit`} className="glass-button px-4 py-2 text-neon-blue border-neon-blue/30 flex items-center gap-2"><Edit size={18} /> Edit Customer</Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-neon-blue to-purple-500 flex items-center justify-center mx-auto mb-4 text-4xl font-bold text-white shadow-lg">
            {customer.photoUrl ? <Image size={42} /> : customer.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
          <p className="text-gray-400">{customer.role}</p>
          <div className="mt-4 inline-flex px-3 py-1 rounded-full bg-neon-green/20 text-neon-green border border-neon-green/30 text-sm capitalize">{customer.status}</div>
        </div>

        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-5">Account Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Info icon={<Phone size={18} />} label="Phone Number" value={customer.phone} />
            <Info icon={<MapPin size={18} />} label="Address" value={customer.address || "Not set"} />
            <Info icon={<Wifi size={18} />} label="PPPoE Username" value={customer.pppoeUsername || "Not set"} />
            <Info icon={<Package size={18} />} label="Package" value={`${customer.package?.name || "None"} ${customer.package?.speed ? `(${customer.package.speed})` : ""}`} />
            <Info icon={<CreditCard size={18} />} label="Price" value={customer.package?.price ? `৳${customer.package.price}` : "N/A"} />
            <Info icon={<IdCard size={18} />} label="NID Upload" value={customer.nidUrl ? "Uploaded" : "Not uploaded"} />
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <History title="Payment History" rows={customerPayments.map(p => [`৳${p.amount}`, p.method || "N/A", p.status || "pending", p.createdAt?.toLocaleDateString() || "N/A"])} />
        <History title="Invoices" rows={customerInvoices.map(i => [`INV-${i.id}`, `৳${i.amount}`, i.status || "unpaid", i.dueDate?.toLocaleDateString() || "N/A"])} />
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="p-4 bg-white/5 rounded-xl flex items-start gap-3"><div className="text-neon-blue mt-1">{icon}</div><div><p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p><p className="text-white font-medium">{value}</p></div></div>;
}

function History({ title, rows }: { title: string; rows: string[][] }) {
  return <div className="glass-card overflow-hidden"><div className="p-5 border-b border-white/10 bg-white/5"><h3 className="text-white font-semibold">{title}</h3></div><div className="divide-y divide-white/5">{rows.length === 0 ? <div className="p-6 text-center text-gray-500">No records</div> : rows.map((row, index) => <div key={index} className="p-4 grid grid-cols-4 gap-2 text-sm">{row.map((col, i) => <span key={i} className={i === 0 ? "text-white font-medium" : "text-gray-400"}>{col}</span>)}</div>)}</div></div>;
}
