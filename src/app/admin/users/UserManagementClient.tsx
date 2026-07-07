"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Edit, Trash2, Wallet, Eye, EyeOff, X, Save,
  Loader2, CheckCircle2, AlertCircle, UserCheck, UserX, RefreshCw, ShieldCheck, ShieldAlert
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

interface User {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  role: string;
  status: string | null;
  walletBalance: string | null;
  createdAt: Date | null;
  permissions?: string | null;
}

interface Props {
  resellers: User[];
  employees: User[];
  customerCountByReseller: Record<number, number>;
  createUser: (formData: FormData) => Promise<void>;
  updateUser: (formData: FormData) => Promise<void>;
  deleteUser: (formData: FormData) => Promise<void>;
  resetWallet: (formData: FormData) => Promise<void>;
}

const AVAILABLE_PERMISSIONS = [
  "Customer Id Auto Generate",
  "Update Customer Balance",
  "Mikrotik Delete",
  "Promise Date",
  "Report Delete",
  "Expenditure Delete",
  "Bulk Area Edit",
  "Bulk Status Edit",
  "Bulk BillingCycle Edit",
  "Bulk Promise Date Edit",
  "Bulk Auto Disable Edit",
  "Bulk Package Edit",
  "Bulk Transfer To Reseller",
  "Bulk Customer Delete",
  "Bulk Customer Mikrotik Update",
  "Customer Auto Connection",
  "Bulk Customer Recharge",
  "Add Customer with Mobile",
  "Instant Recharge Bill Print",
  "In-Active/Offline Customer Delete",
  "Reseller Add",
  "Multiple Manager",
  "Reseller Customer Bulk Status Edit",
  "Reseller Customer Bulk Promise Date Edit"
];

export default function UserManagementClient({
  resellers, employees, customerCountByReseller,
  createUser, updateUser, deleteUser, resetWallet,
}: Props) {
  const [tab, setTab] = useState<"reseller" | "employee">("reseller");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [walletUser, setWalletUser] = useState<User | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  
  const [addPermissions, setAddPermissions] = useState<string[]>([]);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  useEffect(() => {
    const saved = localStorage.getItem('isp_page_size');
    if (saved) setPageSize(Number(saved));
  }, []);

  const handleTabChange = (newTab: "reseller" | "employee") => {
    setTab(newTab);
    setCurrentPage(1);
  };

  const list = tab === "reseller" ? resellers : employees;
  const paginatedList = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleEditClick = (u: User) => {
    setEditUser(u);
    setShowAddForm(false);
    setWalletUser(null);
    try {
      setEditPermissions(JSON.parse(u.permissions || "[]"));
    } catch {
      setEditPermissions([]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide">User Management</h1>
        <button
          onClick={() => { setShowAddForm(true); setEditUser(null); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold hover:bg-neon-blue/30 transition"
        >
          <Plus size={18} /> Add {tab === "reseller" ? "Reseller" : "Employee"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => handleTabChange("reseller")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition border ${
            tab === "reseller"
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
          }`}
        >
          <Wallet size={16} /> Resellers ({resellers.length})
        </button>
        <button
          onClick={() => handleTabChange("employee")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition border ${
            tab === "employee"
              ? "bg-neon-blue/20 text-neon-blue border-neon-blue/40"
              : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
          }`}
        >
          <Users size={16} /> Employees ({employees.length})
        </button>
      </div>

      {/* Stats */}
      {tab === "reseller" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs text-gray-400">Total Resellers</p>
            <p className="text-2xl font-bold text-white">{resellers.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-400">Active</p>
            <p className="text-2xl font-bold text-neon-green">{resellers.filter(r => r.status === "active").length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-400">Total Wallet</p>
            <p className="text-2xl font-bold text-purple-300">
              ৳{resellers.reduce((s, r) => s + Number(r.walletBalance || 0), 0).toFixed(0)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-400">Customers Managed</p>
            <p className="text-2xl font-bold text-neon-blue">
              {Object.values(customerCountByReseller).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-white/5">
          <h2 className="text-lg font-semibold text-white capitalize">
            {tab === "reseller" ? "Reseller Accounts" : "Employee Accounts"}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs text-gray-400 uppercase tracking-wider">
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Phone</th>
                <th className="p-4 text-left">Status</th>
                {tab === "reseller" && <th className="p-4 text-left">Wallet</th>}
                {tab === "reseller" && <th className="p-4 text-left">Customers</th>}
                <th className="p-4 text-left">Joined</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={tab === "reseller" ? 7 : 5} className="p-10 text-center text-gray-500">
                    No {tab}s added yet. Click "Add {tab === "reseller" ? "Reseller" : "Employee"}" to create one.
                  </td>
                </tr>
              ) : paginatedList.map((u) => (
                <tr key={u.id} className="hover:bg-white/5">
                  <td className="p-4">
                    <div className="font-semibold text-white">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.address || "No address"}</div>
                  </td>
                  <td className="p-4 text-gray-300 font-mono">{u.phone}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      u.status === "active"
                        ? "bg-neon-green/20 text-neon-green border border-neon-green/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                      {u.status === "active" ? <UserCheck size={10} /> : <UserX size={10} />}
                      {u.status}
                    </span>
                  </td>
                  {tab === "reseller" && (
                    <td className="p-4">
                      <span className="font-bold text-purple-300">৳{Number(u.walletBalance || 0).toFixed(2)}</span>
                    </td>
                  )}
                  {tab === "reseller" && (
                    <td className="p-4 text-gray-300">
                      {customerCountByReseller[u.id] || 0} customers
                    </td>
                  )}
                  <td className="p-4 text-gray-400 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="p-1.5 rounded-lg hover:bg-neon-blue/20 text-gray-400 hover:text-neon-blue transition"
                        title="Edit"
                      >
                        <Edit size={15} />
                      </button>
                      {tab === "reseller" && (
                        <button
                          onClick={() => { setWalletUser(u); setEditUser(null); setShowAddForm(false); }}
                          className="p-1.5 rounded-lg hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 transition"
                          title="Adjust Wallet"
                        >
                          <Wallet size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > 0 && (
            <div className="p-4 border-t border-white/10">
              <Pagination
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            localStorage.setItem('isp_page_size', newSize.toString());
            // @ts-ignore
            if (typeof setCurrentPage !== 'undefined') setCurrentPage(1);
            // @ts-ignore
            if (typeof setCurrentActivePage !== 'undefined') setCurrentActivePage(1);
            // @ts-ignore
            if (typeof setCurrentSecretsPage !== 'undefined') setCurrentSecretsPage(1);
            // @ts-ignore
            if (typeof setRoutersPage !== 'undefined') setRoutersPage(1);
          }}
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(list.length / pageSize))}
                totalItems={list.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add User Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="text-neon-blue" size={20} />
                Add {tab === "reseller" ? "Reseller" : "Employee"} Account
              </h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form action={createUser} className="grid md:grid-cols-2 gap-5" onSubmit={() => setShowAddForm(false)}>
              <input type="hidden" name="role" value={tab} />
              <div>
                <label className="block text-sm text-gray-300 mb-2">Full Name *</label>
                <input name="name" required placeholder="e.g. Rahim Uddin" className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Phone Number *</label>
                <input name="phone" required placeholder="01700000000" className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Password * (min 6 chars)</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Set login password"
                    className="w-full glass-input px-4 py-3 pr-12 bg-slate-800 text-white"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Address</label>
                <input name="address" placeholder="Optional address" className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
              </div>
              {/* Permissions Checkboxes */}
              <div className="md:col-span-2 space-y-3 mt-2">
                <label className="block text-sm font-semibold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-neon-blue" /> Access Permissions (Control Panel Access)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = addPermissions.includes(perm);
                    return (
                      <label key={perm} className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAddPermissions([...addPermissions, perm]);
                            } else {
                              setAddPermissions(addPermissions.filter((p) => p !== perm));
                            }
                          }}
                          className="rounded bg-slate-950 border-white/10 text-neon-blue focus:ring-0 mt-0.5"
                        />
                        <span>{perm}</span>
                      </label>
                    );
                  })}
                </div>
                <input type="hidden" name="permissions" value={JSON.stringify(addPermissions)} />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="px-6 py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/40 font-semibold hover:bg-neon-green/30 transition flex items-center gap-2">
                  <Save size={16} /> Create Account
                </button>
                <button type="button" onClick={() => { setShowAddForm(false); setAddPermissions([]); }} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Form */}
      <AnimatePresence>
        {editUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="text-neon-blue" size={20} />
                Edit: {editUser.name}
              </h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form action={updateUser} className="grid md:grid-cols-2 gap-5" onSubmit={() => setEditUser(null)}>
              <input type="hidden" name="id" value={editUser.id} />
              <div>
                <label className="block text-sm text-gray-300 mb-2">Full Name *</label>
                <input name="name" required defaultValue={editUser.name} className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Phone Number *</label>
                <input name="phone" required defaultValue={editUser.phone} className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Address</label>
                <input name="address" defaultValue={editUser.address || ""} className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Status</label>
                <select name="status" defaultValue={editUser.status || "active"} className="w-full glass-input px-4 py-3 bg-slate-800 text-white">
                  <option value="active" className="bg-slate-800">Active</option>
                  <option value="suspended" className="bg-slate-800">Suspended</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-300 mb-2">New Password (leave blank to keep current)</label>
                <div className="relative">
                  <input
                    name="newPassword"
                    type={showEditPwd ? "text" : "password"}
                    minLength={6}
                    placeholder="Leave blank to keep current password"
                    className="w-full glass-input px-4 py-3 pr-12 bg-slate-800 text-white"
                  />
                  <button type="button" onClick={() => setShowEditPwd(!showEditPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showEditPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {/* Permissions Checkboxes */}
              <div className="md:col-span-2 space-y-3 mt-2">
                <label className="block text-sm font-semibold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-neon-blue" /> Access Permissions (Control Panel Access)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = editPermissions.includes(perm);
                    return (
                      <label key={perm} className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditPermissions([...editPermissions, perm]);
                            } else {
                              setEditPermissions(editPermissions.filter((p) => p !== perm));
                            }
                          }}
                          className="rounded bg-slate-950 border-white/10 text-neon-blue focus:ring-0 mt-0.5"
                        />
                        <span>{perm}</span>
                      </label>
                    );
                  })}
                </div>
                <input type="hidden" name="permissions" value={JSON.stringify(editPermissions)} />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="px-6 py-3 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/40 font-semibold hover:bg-neon-blue/30 transition flex items-center gap-2">
                  <Save size={16} /> Save Changes
                </button>
                <button type="button" onClick={() => { setEditUser(null); setEditPermissions([]); }} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet Adjust Form */}
      <AnimatePresence>
        {walletUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-purple-400" size={20} />
                Adjust Wallet: {walletUser.name}
              </h2>
              <button onClick={() => setWalletUser(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-gray-400 text-sm">বর্তমান Balance: <span className="text-purple-300 font-bold">৳{Number(walletUser.walletBalance || 0).toFixed(2)}</span></p>
            <form action={resetWallet} className="flex gap-4 items-end" onSubmit={() => setWalletUser(null)}>
              <input type="hidden" name="id" value={walletUser.id} />
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-2">নতুন Wallet Balance (৳)</label>
                <input
                  name="walletBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={walletUser.walletBalance || "0"}
                  className="w-full glass-input px-4 py-3 bg-slate-800 text-white"
                />
              </div>
              <button type="submit" className="px-6 py-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold hover:bg-purple-500/30 transition flex items-center gap-2">
                <RefreshCw size={16} /> Update Balance
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 max-w-md w-full space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle size={28} />
                <h2 className="text-xl font-bold text-white">Delete Account?</h2>
              </div>
              <p className="text-gray-300">
                <span className="font-bold text-white">{confirmDelete.name}</span> ({confirmDelete.role}) এর account মুছে ফেলা হবে।
                {confirmDelete.role === "reseller" && (
                  <span className="block mt-2 text-yellow-400 text-sm">⚠️ এই reseller-এর সব customer orphan হয়ে যাবে!</span>
                )}
              </p>
              <div className="flex gap-3">
                <form action={deleteUser} onSubmit={() => setConfirmDelete(null)}>
                  <input type="hidden" name="id" value={confirmDelete.id} />
                  <button type="submit" className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-semibold hover:bg-red-500/30 transition">
                    হ্যাঁ, Delete করুন
                  </button>
                </form>
                <button onClick={() => setConfirmDelete(null)} className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition">
                  বাতিল
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
