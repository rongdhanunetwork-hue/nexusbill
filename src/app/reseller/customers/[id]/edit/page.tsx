"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, AlertCircle, Upload } from "lucide-react";

interface Package {
  id: number;
  name: string;
  speed: string;
  price: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  pppoeUsername: string | null;
  macAddress: string | null;
  ipAddress: string | null;
  photoUrl: string | null;
  nidUrl: string | null;
  nidNumber: string | null;
  packageId: number | null;
  status: string | null;
  expireDate: string | null;
  createdAt: string | null;
  dob: string | null;
}

const toLocalDatetimeString = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

export default function ResellerEditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const customerId = Number(id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch packages
    fetch("/api/admin/packages")
      .then((r) => r.json())
      .then(setPackages);

    // Fetch customer details
    fetch(`/api/admin/customers/${customerId}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error("Failed to load customer");
        }
        return r.json();
      })
      .then((data) => {
        setCustomer(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load customer details");
        setLoading(false);
      });
  }, [customerId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const body = {
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      address: String(form.get("address") || "").trim(),
      pppoeUsername: String(form.get("pppoeUsername") || "").trim(),
      macAddress: String(form.get("macAddress") || "").trim(),
      ipAddress: String(form.get("ipAddress") || "").trim(),
      photoUrl: String(form.get("photoUrl") || "").trim(),
      nidUrl: String(form.get("nidUrl") || "").trim(),
      nidNumber: String(form.get("nidNumber") || "").trim(),
      packageId: form.get("packageId") ? Number(form.get("packageId")) : null,
      status: String(form.get("status") || "active"),
      createdAt: form.get("createdAt") ? new Date(String(form.get("createdAt"))).toISOString() : null,
      expireDate: form.get("expireDate") ? new Date(String(form.get("expireDate"))).toISOString() : null,
      dob: form.get("dob") ? new Date(String(form.get("dob"))).toISOString() : null,
    };

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setError(data.error || "Failed to update customer.");
      } else {
        router.push(`/reseller/customers/${customerId}`);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={40} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-12 text-red-400">
        <AlertCircle size={40} className="mx-auto mb-2" />
        {error || "Customer not found"}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/reseller/customers/${customer.id}`} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-wide">Edit Customer</h1>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 md:p-8 space-y-6"
      >
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Name" name="name" defaultValue={customer.name} required />
          <Field label="Phone/User ID" name="phone" defaultValue={customer.phone} required />
          <Field label="Address" name="address" defaultValue={customer.address || ""} />
          <Field label="PPPoE Username" name="pppoeUsername" defaultValue={customer.pppoeUsername || ""} />
          <Field label="MAC Address" name="macAddress" defaultValue={customer.macAddress || ""} />
          <Field label="IP Address" name="ipAddress" defaultValue={customer.ipAddress || ""} />
          <Field label="NID Number" name="nidNumber" defaultValue={customer.nidNumber || ""} />
          <div>
            <label className="block text-sm text-gray-300 mb-2">Date of Birth (জন্ম তারিখ)</label>
            <input
              type="date"
              name="dob"
              defaultValue={customer.dob ? customer.dob.slice(0, 10) : ""}
              className="w-full glass-input px-4 py-3 bg-slate-800 text-white border border-white/10"
            />
          </div>
          <ImageUploadField label="Customer Photo" name="photoUrl" defaultValue={customer.photoUrl || ""} />
          <ImageUploadField label="NID Document Upload" name="nidUrl" defaultValue={customer.nidUrl || ""} />
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Package</label>
            <select name="packageId" defaultValue={customer.packageId || ""} className="w-full glass-input px-4 py-3 bg-slate-800 text-white border border-white/10">
              <option value="" className="bg-slate-800">No Package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id} className="bg-slate-800">
                  {pkg.name} - {pkg.speed} - ৳{pkg.price}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Status</label>
            <select name="status" defaultValue={customer.status || "active"} className="w-full glass-input px-4 py-3 bg-slate-800 text-white border border-white/10">
              <option className="bg-slate-800" value="active">Active</option>
              <option className="bg-slate-800" value="expired">Expired</option>
              <option className="bg-slate-800" value="suspended">Suspended</option>
              <option className="bg-slate-800" value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Profile Creation Date</label>
            <input
              type="date"
              name="createdAt"
              defaultValue={customer.createdAt ? customer.createdAt.slice(0, 10) : ""}
              className="w-full glass-input px-4 py-3 bg-slate-800 text-white border border-white/10"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Expire Date & Time</label>
            <input
              type="datetime-local"
              name="expireDate"
              defaultValue={customer.expireDate ? toLocalDatetimeString(customer.expireDate) : ""}
              className="w-full glass-input px-4 py-3 bg-slate-800 text-white border border-white/10"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 font-semibold hover:bg-purple-500/30 transition-colors"
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={18} /> Update Customer</>
            )}
          </button>
          <Link href={`/reseller/customers/${customer.id}`} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors">
            Cancel
          </Link>
        </div>
      </motion.form>
    </div>
  );
}

function Field({ label, name, defaultValue, required }: { label: string; name: string; defaultValue: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-2">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full glass-input px-4 py-3 bg-slate-800 text-white border border-white/10"
      />
    </div>
  );
}

function ImageUploadField({ label, name, defaultValue, onChange }: { label: string; name: string; defaultValue?: string; onChange?: (val: string) => void }) {
  const [value, setValue] = useState(defaultValue || "");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setValue(data.url);
        if (onChange) onChange(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex gap-3 items-center">
        <input type="hidden" name={name} value={value} />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${name}`}
        />
        <label
          htmlFor={`file-upload-${name}`}
          className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-300 font-semibold cursor-pointer flex items-center gap-2"
        >
          {uploading ? <Loader2 size={16} className="animate-spin text-purple-400" /> : <Upload size={16} />} Select Image
        </label>
        {value && (
          <div className="flex items-center gap-2">
            <img src={value} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-white/10" />
            <span className="text-xs text-gray-400 truncate max-w-40">{value.split("/").pop()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
