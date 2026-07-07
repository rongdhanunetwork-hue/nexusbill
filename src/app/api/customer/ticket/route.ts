import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { createNotificationForAdmins } from "@/lib/notifications";
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { subject, message } = await req.json();

  if (!subject || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
  }

  const [ticket] = await db.insert(tickets).values({
    userId: session.userId,
    subject: subject.trim(),
    message: message.trim(),
    status: "open",
  }).returning();

  await createNotificationForAdmins(
    "New Support Ticket",
    `A new support ticket was opened: ${subject.trim()}`,
    "/admin/tickets"
  );

  return NextResponse.json(ticket, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const userTickets = await db.query.tickets.findMany({
    where: eq(tickets.userId, session.userId),
    orderBy: [desc(tickets.createdAt)],
  });

  return NextResponse.json(userTickets);
}
