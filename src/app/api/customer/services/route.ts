import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceCategories, serviceLinks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Customer view - gets categories & links from their admin
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the customer's adminId
  const { db: dbConn } = await import("@/db");
  const { users } = await import("@/db/schema");
  const customer = await dbConn.query.users.findFirst({
    where: eq(users.id, session.userId)
  });

  if (!customer?.adminId) return NextResponse.json([]);

  const categories = await db.query.serviceCategories.findMany({
    where: eq(serviceCategories.adminId, customer.adminId),
    orderBy: [asc(serviceCategories.sortOrder)],
    with: {
      links: {
        where: eq(serviceLinks.isActive, true),
        orderBy: [asc(serviceLinks.sortOrder)]
      }
    }
  });

  // Only return active categories with at least one link (or active ones)
  return NextResponse.json(categories.filter(c => c.isActive));
}
