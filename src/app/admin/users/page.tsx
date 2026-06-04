import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import UserManagementClient from "./UserManagementClient";

export const dynamic = "force-dynamic";

async function createUser(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "employee")) redirect("/login");

  let adminId = session.userId;
  if (session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const role = String(formData.get("role") || "employee") as "reseller" | "employee";
  const address = String(formData.get("address") || "").trim();
  const permissions = String(formData.get("permissions") || "[]");

  if (session.role === "employee" && role === "reseller") {
    const { hasPermission } = await import("@/lib/permissions");
    const allowed = await hasPermission(session.userId, "Reseller Add");
    if (!allowed) throw new Error("Permission Denied: You do not have 'Reseller Add' permission");
  }

  if (!name || !phone || !password || password.length < 6) return;

  const existing = await db.query.users.findFirst({ where: eq(users.phone, phone) });
  if (existing) return;

  const hashed = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    name,
    phone,
    password: hashed,
    role,
    address: address || null,
    approvalStatus: "approved",
    status: "active",
    walletBalance: "0",
    permissions,
    adminId,
  });

  revalidatePath("/admin/users");
}

async function updateUser(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "employee")) redirect("/login");

  let adminId = session.userId;
  if (session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  const id = Number(formData.get("id"));
  if (!id) return;

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { adminId: true }
  });
  if (!targetUser || targetUser.adminId !== adminId) return;

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const newPassword = String(formData.get("newPassword") || "").trim();
  const status = String(formData.get("status") || "active");
  const permissions = String(formData.get("permissions") || "[]");

  if (!name || !phone) return;

  const updateData: Record<string, any> = { name, phone, address: address || null, status, permissions };
  if (newPassword && newPassword.length >= 6) {
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  await db.update(users).set(updateData).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

async function deleteUser(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "employee")) redirect("/login");

  let adminId = session.userId;
  if (session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  const id = Number(formData.get("id"));
  if (!id) return;

  // Don't allow deleting the admin themselves
  if (id === session.userId) return;

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { adminId: true }
  });
  if (!targetUser || targetUser.adminId !== adminId) return;

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

async function resetWallet(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "employee")) redirect("/login");

  let adminId = session.userId;
  if (session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  const id = Number(formData.get("id"));
  const amount = String(formData.get("walletBalance") || "0");
  if (!id) return;

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { adminId: true }
  });
  if (!targetUser || targetUser.adminId !== adminId) return;

  if (session.role === "employee") {
    const { hasPermission } = await import("@/lib/permissions");
    const allowed = await hasPermission(session.userId, "Update Customer Balance");
    if (!allowed) throw new Error("Permission Denied: You do not have 'Update Customer Balance' permission");
  }

  await db.update(users).set({ walletBalance: amount }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

export default async function UserManagementPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) redirect("/login");
  const adminId = session.userId;

  const resellers = await db.query.users.findMany({
    where: and(eq(users.role, "reseller"), eq(users.adminId, adminId)),
    orderBy: [desc(users.createdAt)],
  });

  const employees = await db.query.users.findMany({
    where: and(eq(users.role, "employee"), eq(users.adminId, adminId)),
    orderBy: [desc(users.createdAt)],
  });

  // Count customers per reseller
  const allCustomers = await db.query.users.findMany({
    where: and(eq(users.role, "customer"), eq(users.adminId, adminId)),
  });

  const customerCountByReseller: Record<number, number> = {};
  for (const c of allCustomers) {
    if (c.resellerId) {
      customerCountByReseller[c.resellerId] = (customerCountByReseller[c.resellerId] || 0) + 1;
    }
  }

  return (
    <UserManagementClient
      resellers={resellers as any}
      employees={employees as any}
      customerCountByReseller={customerCountByReseller}
      createUser={createUser}
      updateUser={updateUser}
      deleteUser={deleteUser}
      resetWallet={resetWallet}
    />
  );
}
