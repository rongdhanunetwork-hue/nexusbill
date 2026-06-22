import { db } from "@/db";
import { tjBoxes, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import TJBoxesClient from "./TJBoxesClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function createTJBoxAction(name: string, address: string, portCount: number) {
  "use server";
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "reseller")) {
      return { error: "Unauthorized" };
    }
    const adminId = session.role === "reseller" ? undefined : session.userId;
    const resellerId = session.role === "reseller" ? session.userId : null;

    if (!name.trim()) return { error: "Name is required" };
    
    await db.insert(tjBoxes).values({
      name: name.trim(),
      address: address.trim() || null,
      portCount: portCount || 8,
      adminId,
      resellerId,
    });
    
    revalidatePath("/admin/settings/tj-boxes");
    return { success: true };
  } catch (err: any) {
    console.error("Create TJ Box action error:", err);
    return { error: err.message || "Failed to create TJ box" };
  }
}

async function deleteTJBoxAction(id: number) {
  "use server";
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "reseller")) {
      return { error: "Unauthorized" };
    }
    
    // Check if used by customers
    const connectedUsers = await db.query.users.findFirst({
        where: eq(users.tjBoxId, id)
    });

    if (connectedUsers) {
        return { error: "Cannot delete TJ box. It is assigned to one or more customers." };
    }

    const condition = session.role === "reseller" 
        ? and(eq(tjBoxes.id, id), eq(tjBoxes.resellerId, session.userId))
        : eq(tjBoxes.id, id);

    await db.delete(tjBoxes).where(condition);

    revalidatePath("/admin/settings/tj-boxes");
    return { success: true };
  } catch (err: any) {
    console.error("Delete TJ Box action error:", err);
    return { error: err.message || "Failed to delete TJ box" };
  }
}

export default async function TJBoxesPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "reseller")) {
    redirect("/login");
  }

  const condition = session.role === "reseller" 
    ? eq(tjBoxes.resellerId, session.userId)
    : eq(tjBoxes.adminId, session.userId);

  const allBoxes = await db.select().from(tjBoxes).where(condition).orderBy(desc(tjBoxes.createdAt));

  return (
    <TJBoxesClient
      initialBoxes={allBoxes}
      createBox={createTJBoxAction}
      deleteBox={deleteTJBoxAction}
    />
  );
}
