import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickets, ticketReplies } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;
  const ticketId = Number(id);

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (session.role !== "admin" && ticket.userId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const replies = await db.query.ticketReplies.findMany({
    where: eq(ticketReplies.ticketId, ticketId),
    orderBy: [asc(ticketReplies.createdAt)],
    with: {
      user: true
    }
  });

  return NextResponse.json({ ticket, replies });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;
  const ticketId = Number(id);
  const { message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (session.role !== "admin" && ticket.userId !== session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [newReply] = await db.insert(ticketReplies).values({
    ticketId,
    userId: session.userId,
    message: message.trim(),
  }).returning();

  // If admin is replying, update ticket status to open (or keeping open, maybe resolved if they want, but usually it stays open until closed)
  return NextResponse.json(newReply, { status: 201 });
}
