import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allTickets = await db.query.tickets.findMany({
    orderBy: [desc(tickets.createdAt)],
    with: {
      user: true
    }
  });

  return NextResponse.json(allTickets);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ticketId, status } = await req.json();

    if (!ticketId || !status) {
      return NextResponse.json({ error: "Ticket ID and status required" }, { status: 400 });
    }

    const [updated] = await db.update(tickets)
      .set({ status })
      .where(eq(tickets.id, Number(ticketId)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update ticket status error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
