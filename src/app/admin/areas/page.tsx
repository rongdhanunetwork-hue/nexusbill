import { db } from "@/db";
import { areas } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import AreasClient from "./AreasClient";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function createAreaAction(name: string, type: string, parentId: number | null) {
  "use server";
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      return { error: "Unauthorized" };
    }
    const adminId = session.userId;

    if (!name.trim()) return { error: "Name is required" };
    if (!["area", "subarea", "polebox"].includes(type)) return { error: "Invalid type" };
    
    await db.insert(areas).values({
      name: name.trim(),
      type,
      parentId,
      adminId,
    });
    
    revalidatePath("/admin/areas");
    return { success: true };
  } catch (err: any) {
    console.error("Create area action error:", err);
    return { error: err.message || "Failed to create area item" };
  }
}

async function deleteAreaAction(id: number) {
  "use server";
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      return { error: "Unauthorized" };
    }
    const adminId = session.userId;

    // Recursive delete helper to clear descendants
    const getDescendants = async (parentId: number): Promise<number[]> => {
      const children = await db.select().from(areas).where(and(eq(areas.parentId, parentId), eq(areas.adminId, adminId)));
      const descendants = await Promise.all(children.map(c => getDescendants(c.id)));
      return [parentId, ...children.map(c => c.id), ...descendants.flat()];
    };

    const idsToRemove = await getDescendants(id);
    
    for (const removeId of idsToRemove) {
      await db.delete(areas).where(and(eq(areas.id, removeId), eq(areas.adminId, adminId)));
    }

    revalidatePath("/admin/areas");
    return { success: true };
  } catch (err: any) {
    console.error("Delete area action error:", err);
    return { error: err.message || "Failed to delete area item" };
  }
}

export default async function AreasPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }
  const adminId = session.userId;

  const allAreas = await db.select().from(areas).where(eq(areas.adminId, adminId)).orderBy(desc(areas.createdAt));

  return (
    <AreasClient
      initialAreas={allAreas}
      createArea={createAreaAction}
      deleteArea={deleteAreaAction}
    />
  );
}
