"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, Home, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Loader2, Upload } from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "").trim();
    const address = String(form.get("address") || "").trim();
    const photoUrl = String(form.get("photoUrl") || "").trim();
    const nidUrl = String(form.get("nidUrl") || "").trim();

    if (!name || !phone || !password) {
      setError("Name, phone, and password are required.");
      triggerShake();
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      triggerShake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password, address, photoUrl, nidUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        triggerShake();
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-neon-green/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, delay: 0.1 }}
              className="w-20 h-20 bg-neon-green/20 text-neon-green rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(57,255,20,0.3)]"
            >
              <CheckCircle2 size={40} />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-3">Registration Submitted!</h2>
            <p className="text-gray-400 mb-8">
              আপনার account তৈরি হয়েছে। Admin approve করার পর আপনি login করতে পারবেন।
            </p>
            <Link
              href="/login/customer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/30 font-semibold hover:bg-neon-green/30 transition-colors"
            >
              Go to Login <ArrowRight size={18} />
            </Link>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            animate={shake ? { x: [-12, 12, -12, 12, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card p-8 border border-white/10"
          >
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm transition-colors">
              <Home size={15} /> Back to Home
            </Link>

            <div className="w-16 h-16 bg-teal-400/20 rounded-2xl flex items-center justify-center text-teal-400 mb-6 shadow-[0_0_30px_rgba(45,212,191,0.2)]">
              <UserPlus size={32} />
            </div>

            <h1 className="text-3xl font-bold text-white mb-1">Create Account</h1>
            <p className="text-gray-400 mb-8 text-sm">Register for ISP service — Admin will approve your account</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full glass-input px-4 py-3"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  required
                  className="w-full glass-input px-4 py-3"
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                <input
                  name="address"
                  type="text"
                  className="w-full glass-input px-4 py-3"
                  placeholder="Your address (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full glass-input px-4 py-3 pr-12"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <ImageUploadField label="Profile Photo" name="photoUrl" />
              </div>

              <div>
                <ImageUploadField label="NID Document" name="nidUrl" />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-teal-400/20 text-teal-400 border border-teal-400/30 font-semibold flex items-center justify-center gap-2 hover:bg-teal-400/30 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Registering...</>
                ) : (
                  <><UserPlus size={18} /> Create Account</>
                )}
              </button>

              <div className="text-center text-sm text-gray-500 pt-1">
                Already have an account?{" "}
                <Link href="/login/customer" className="text-neon-green hover:underline">Login here</Link>
              </div>
            </div>
          </motion.form>
        )}
      </div>
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
          {uploading ? <Loader2 size={16} className="animate-spin text-neon-green" /> : <Upload size={16} />} Select Image
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
