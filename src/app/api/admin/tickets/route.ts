import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickets, users } from "@/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let adminId = session.userId;
  if (session.role === "reseller" || session.role === "employee") {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { adminId: true }
    });
    adminId = u?.adminId || 1;
  }

  let allTickets: any[] = [];
  if (session.role === "reseller") {
    const resellerCustomers = await db.query.users.findMany({
      where: and(eq(users.role, "customer"), eq(users.resellerId, session.userId), eq(users.adminId, adminId)),
      columns: { id: true }
    });
    const customerIds = resellerCustomers.map(c => c.id);
    if (customerIds.length === 0) {
      allTickets = [];
    } else {
      allTickets = await db.query.tickets.findMany({
        where: inArray(tickets.userId, customerIds),
        orderBy: [desc(tickets.createdAt)],
        with: {
          user: true
        }
      });
    }
  } else {
    const rawTickets = await db
      .select({
        ticket: tickets,
        user: users
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .where(eq(users.adminId, adminId))
      .orderBy(desc(tickets.createdAt));

    allTickets = rawTickets.map(r => ({
      ...r.ticket,
      user: r.user
    }));
  }

  return NextResponse.json(allTickets);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ticketId, status } = await req.json();

    if (!ticketId || !status) {
      return NextResponse.json({ error: "Ticket ID and status required" }, { status: 400 });
    }

    let adminId = session.userId;
    if (session.role === "reseller" || session.role === "employee") {
      const u = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { adminId: true }
      });
      adminId = u?.adminId || 1;
    }

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, Number(ticketId)),
      with: { user: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!ticket.user || (ticket.user as any).adminId !== adminId) {
      return NextResponse.json({ error: "Forbidden: Access denied to tenant resource" }, { status: 403 });
    }

    if (session.role === "reseller") {
      if ((ticket.user as any).resellerId !== session.userId) {
        return NextResponse.json({ error: "Forbidden: Not your customer's ticket" }, { status: 403 });
      }
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
