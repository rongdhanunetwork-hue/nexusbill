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
  ipAddress: varchar("ip_address", { length: 50 }),
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
  promiseDate: timestamp("promise_date"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
  connectionFee: decimal("connection_fee", { precision: 10, scale: 2 }).default("0"),
  areaId: integer("area_id"),
  note: text("note"),
  customerType: varchar("customer_type", { length: 20 }).default("pppoe"), // pppoe, static, hotspot
  permissions: text("permissions").default("[]"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  autoRenew: boolean("auto_renew").default(false),
  ponPort: varchar("pon_port", { length: 50 }),
  onuMac: varchar("onu_mac", { length: 100 }),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  speed: varchar("speed", { length: 50 }).notNull(), // e.g., '10 Mbps'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationDays: integer("duration_days").default(30),
  dataLimitGb: integer("data_limit_gb"), // null means unlimited
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
  resellerId: integer("reseller_id"),
});

export const olts = pgTable("olts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  portCount: integer("port_count").default(8),
  connectionPort: integer("connection_port").default(23),
  status: boolean("status").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  resellerId: integer("reseller_id"),
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
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketReplies = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id").notNull(),
  customerId: integer("customer_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // credit_in, recharge, refund
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(), // bandwidth, tower, office, salary, other
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  expenseDate: date("expense_date").notNull(),
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
  resellerTransactions: many(transactions, { relationName: "resellerTransactions" }),
  customerTransactions: many(transactions, { relationName: "customerTransactions" }),
  area: one(areas, {
    fields: [users.areaId],
    references: [areas.id],
  }),
  packageChangeRequests: many(packageChangeRequests),
  withdrawalRequests: many(withdrawalRequests),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  reseller: one(users, {
    fields: [transactions.resellerId],
    references: [users.id],
    relationName: "resellerTransactions",
  }),
  customer: one(users, {
    fields: [transactions.customerId],
    references: [users.id],
    relationName: "customerTransactions",
  }),
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

export const areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'area', 'subarea', 'polebox'
  parentId: integer("parent_id"), // null for area, area_id for subarea, subarea_id for polebox
  createdAt: timestamp("created_at").defaultNow(),
});

export const areasRelations = relations(areas, ({ one, many }) => ({
  parent: one(areas, {
    fields: [areas.parentId],
    references: [areas.id],
    relationName: "areaHierarchy",
  }),
  subAreas: many(areas, {
    relationName: "areaHierarchy",
  }),
  users: many(users),
}));

export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 50 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }), // payment, expiry, reminder, manual, bulk
  status: varchar("status", { length: 20 }).default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  template: text("template").notNull(),
  description: varchar("description", { length: 255 }),
});

export const packageChangeRequests = pgTable("package_change_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currentPackageId: integer("current_package_id"),
  requestedPackageId: integer("requested_package_id").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const packageChangeRequestsRelations = relations(packageChangeRequests, ({ one }) => ({
  user: one(users, {
    fields: [packageChangeRequests.userId],
    references: [users.id],
  }),
  currentPackage: one(packages, {
    fields: [packageChangeRequests.currentPackageId],
    references: [packages.id],
  }),
  requestedPackage: one(packages, {
    fields: [packageChangeRequests.requestedPackageId],
    references: [packages.id],
  }),
}));

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 50 }), // bkash, nagad, bank
  account: varchar("account", { length: 100 }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  reseller: one(users, {
    fields: [withdrawalRequests.resellerId],
    references: [users.id],
  }),
}));

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // router, onu, cable, switch, tool
  serialNumber: varchar("serial_number", { length: 100 }).unique(),
  status: varchar("status", { length: 20 }).default("in_stock"), // in_stock, assigned, faulty, lost
  assignedUserId: integer("assigned_user_id"), // Technician or Reseller
  branchId: integer("branch_id"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryRelations = relations(inventory, ({ one }) => ({
  assignedUser: one(users, {
    fields: [inventory.assignedUserId],
    references: [users.id],
  }),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // e.g., 'CREATE_CUSTOMER', 'DELETE_INVOICE'
  details: text("details"), // JSON stringified or text description
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

