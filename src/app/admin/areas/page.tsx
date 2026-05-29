import { db } from "@/db";
import { areas } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import AreasClient from "./AreasClient";

export const dynamic = "force-dynamic";

async function createAreaAction(name: string, type: string, parentId: number | null) {
  "use server";
  try {
    if (!name.trim()) return { error: "Name is required" };
    if (!["area", "subarea", "polebox"].includes(type)) return { error: "Invalid type" };
    
    await db.insert(areas).values({
      name: name.trim(),
      type,
      parentId,
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
    // Recursive delete helper to clear descendants
    const getDescendants = async (parentId: number): Promise<number[]> => {
      const children = await db.select().from(areas).where(eq(areas.parentId, parentId));
      const descendants = await Promise.all(children.map(c => getDescendants(c.id)));
      return [parentId, ...children.map(c => c.id), ...descendants.flat()];
    };

    const idsToRemove = await getDescendants(id);
    
    for (const removeId of idsToRemove) {
      await db.delete(areas).where(eq(areas.id, removeId));
    }

    revalidatePath("/admin/areas");
    return { success: true };
  } catch (err: any) {
    console.error("Delete area action error:", err);
    return { error: err.message || "Failed to delete area item" };
  }
}

export default async function AreasPage() {
  const allAreas = await db.select().from(areas).orderBy(desc(areas.createdAt));

  return (
    <AreasClient
      initialAreas={allAreas}
      createArea={createAreaAction}
      deleteArea={deleteAreaAction}
    />
  );
}
