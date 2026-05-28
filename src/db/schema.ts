import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 20 }).notNull().default("customer"), // admin, customer
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  address: text("address"),
  photoUrl: text("photo_url"),
  nidUrl: text("nid_url"),
  nidNumber: varchar("nid_number", { length: 50 }),
  pppoeUsername: varchar("pppoe_username", { length: 255 }),
  macAddress: varchar("mac_address", { length: 100 }),
  packageId: integer("package_id"),
  mikrotikId: integer("mikrotik_id"),
  oltId: integer("olt_id"),
  resellerId: integer("reseller_id"),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 50 }).default("active"), // active, offline, online, expired
  approvalStatus: varchar("approval_status", { length: 20 }).default("approved"), // pending, approved, rejected
  expireDate: timestamp("expire_date"),
  dob: timestamp("dob"),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  speed: varchar("speed", { length: 50 }).notNull(), // e.g., '10 Mbps'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationDays: integer("duration_days").default(30),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mikrotiks = pgTable("mikrotiks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  apiPort: integer("api_port").default(80),
  username: varchar("username", { length: 255 }).notNull(),
  password: text("password").notNull(),
  status: boolean("status").default(true),
});

export const olts = pgTable("olts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  portCount: integer("port_count").default(8),
  connectionPort: integer("connection_port").default(23),
  status: boolean("status").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dataUsage = pgTable("data_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  downloadGb: decimal("download_gb", { precision: 10, scale: 2 }).notNull().default("0"),
  uploadGb: decimal("upload_gb", { precision: 10, scale: 2 }).notNull().default("0"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  trxId: varchar("trx_id", { length: 100 }),
  method: varchar("method", { length: 50 }), // bkash, nagad
  screenshotUrl: text("screenshot_url"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("unpaid"), // paid, unpaid, due
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).default("open"), // open, resolved
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
});

export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).default("general"), // offer, maintenance, general
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketReplies = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  package: one(packages, {
    fields: [users.packageId],
    references: [packages.id],
  }),
  mikrotik: one(mikrotiks, {
    fields: [users.mikrotikId],
    references: [mikrotiks.id],
  }),
  olt: one(olts, {
    fields: [users.oltId],
    references: [olts.id],
  }),
  payments: many(payments),
  invoices: many(invoices),
  tickets: many(tickets),
  ticketReplies: many(ticketReplies),
  dataUsage: many(dataUsage),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  users: many(users),
}));

export const mikrotiksRelations = relations(mikrotiks, ({ many }) => ({
  users: many(users),
}));

export const dataUsageRelations = relations(dataUsage, ({ one }) => ({
  user: one(users, {
    fields: [dataUsage.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  replies: many(ticketReplies),
}));

export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketReplies.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketReplies.userId],
    references: [users.id],
  }),
}));
