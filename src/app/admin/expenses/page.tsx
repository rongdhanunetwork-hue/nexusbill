import { db } from "@/db";
import { expenses } from "@/db/schema";
import { desc, sql, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PlusCircle, Trash2, TrendingDown, Calendar } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { value: "bandwidth", label: "Bandwidth Cost" },
  { value: "tower", label: "Tower / Infrastructure" },
  { value: "office", label: "Office Expenses" },
  { value: "salary", label: "Employee Salary" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

async function addExpense(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return;
  }
  const adminId = session.userId;

  const category = String(formData.get("category") || "other");
  const amount = String(formData.get("amount") || "0");
  const note = String(formData.get("note") || "");
  const expenseDate = String(formData.get("expenseDate") || new Date().toISOString().slice(0, 10));

  if (!amount || Number(amount) <= 0) return;

  await db.insert(expenses).values({
    category,
    amount,
    note: note || null,
    expenseDate,
    adminId,
  });

  revalidatePath("/admin/expenses");
}

async function deleteExpense(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return;
  }
  const adminId = session.userId;

  const id = Number(formData.get("id"));
  if (!id) return;
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.adminId, adminId)));
  revalidatePath("/admin/expenses");
}

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }
  const adminId = session.userId;

  const allExpenses = await db.query.expenses.findMany({
    where: eq(expenses.adminId, adminId),
    orderBy: [desc(expenses.createdAt)],
  });

  const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by category for summary
  const categoryTotals: Record<string, number> = {};
  for (const e of allExpenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
  }

  // This month expenses
  const thisMonth = allExpenses.filter((e) => {
    const d = new Date(e.expenseDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonth.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wide">Expense Tracking</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-gray-400">Total Expenses</p>
          <p className="text-2xl font-bold text-red-400">৳{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-400">This Month</p>
          <p className="text-2xl font-bold text-orange-400">৳{thisMonthTotal.toFixed(2)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-400">Total Records</p>
          <p className="text-2xl font-bold text-white">{allExpenses.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-gray-400">Categories Used</p>
          <p className="text-2xl font-bold text-neon-blue">{Object.keys(categoryTotals).length}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Add Expense Form */}
        <form action={addExpense} className="glass-card p-6 md:p-8 space-y-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PlusCircle className="text-neon-green" size={22} /> Add Expense
          </h2>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Category</label>
            <select name="category" required className="w-full glass-input px-4 py-3 bg-slate-800 text-white">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-slate-800">{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Amount (৳)</label>
            <input name="amount" type="number" required min="1" step="0.01" placeholder="0.00" className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Expense Date</label>
            <input name="expenseDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full glass-input px-4 py-3 bg-slate-800 text-white" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Note (optional)</label>
            <textarea name="note" placeholder="Description..." rows={2} className="w-full glass-input px-4 py-3 bg-slate-800 text-white resize-none" />
          </div>

          <button type="submit" className="w-full py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/40 font-semibold hover:bg-neon-green/30 transition">
            <PlusCircle size={16} className="inline mr-2" /> Add Expense Record
          </button>
        </form>

        {/* Category Summary */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingDown className="text-red-400" size={22} /> Category Summary
          </h2>
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const amount = categoryTotals[cat.value] || 0;
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={cat.value}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{cat.label}</span>
                    <span className="text-white font-medium">৳{amount.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center gap-2">
          <Calendar size={18} className="text-neon-blue" />
          <h2 className="text-lg font-semibold text-white">Expense History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-left text-gray-400 font-medium">Date</th>
                <th className="p-4 text-left text-gray-400 font-medium">Category</th>
                <th className="p-4 text-left text-gray-400 font-medium">Note</th>
                <th className="p-4 text-right text-gray-400 font-medium">Amount</th>
                <th className="p-4 text-center text-gray-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {allExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No expense records yet.
                  </td>
                </tr>
              ) : (
                allExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-gray-300">{new Date(e.expenseDate).toLocaleDateString("en-BD")}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 max-w-xs truncate">{e.note || "—"}</td>
                    <td className="p-4 text-right font-bold text-red-400">৳{Number(e.amount).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <form action={deleteExpense}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
