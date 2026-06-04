/**
 * Seed Script — Creates admin user + sample packages + initial settings
 * Run: npx tsx seed.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱 Starting seed...");

  // 1. Create or update users (admin, customer, reseller, employee)
  const hashed = await bcrypt.hash("password123", 12);
  const usersToSeed = [
    {
      name: "Super Admin",
      phone: "01800000000",
      role: "superadmin",
      password: hashed,
      approvalStatus: "approved",
      status: "active",
    },
    {
      name: "Admin",
      phone: "01700000000",
      role: "admin",
      password: hashed,
      approvalStatus: "approved",
      status: "active",
    },
    {
      name: "Pronoy Saha",
      phone: "01618721061",
      role: "customer",
      password: hashed,
      approvalStatus: "approved",
      status: "active",
    },
    {
      name: "Demo Reseller",
      phone: "01900000000",
      role: "reseller",
      password: hashed,
      approvalStatus: "approved",
      status: "active",
    },
    {
      name: "Demo Employee",
      phone: "01600000000",
      role: "employee",
      password: hashed,
      approvalStatus: "approved",
      status: "active",
    },
  ];

  for (const u of usersToSeed) {
    const existing = await db.query.users.findFirst({ where: eq(schema.users.phone, u.phone) });
    if (!existing) {
      await db.insert(schema.users).values(u);
      console.log(`✅ User created: name=${u.name}, phone=${u.phone}, role=${u.role}, password=password123`);
    } else {
      await db.update(schema.users).set({ password: u.password, approvalStatus: "approved", status: "active" }).where(eq(schema.users.phone, u.phone));
      console.log(`✅ User updated (password reset to password123): name=${u.name}, phone=${u.phone}, role=${u.role}`);
    }
  }

  // 2. Sample packages
  const existing_pkg = await db.query.packages.findFirst();
  if (!existing_pkg) {
    await db.insert(schema.packages).values([
      { name: "Basic 10Mbps", speed: "10 Mbps", price: "500", durationDays: 30 },
      { name: "Standard 20Mbps", speed: "20 Mbps", price: "800", durationDays: 30 },
      { name: "Premium 30Mbps", speed: "30 Mbps", price: "1200", durationDays: 30 },
      { name: "Ultra 50Mbps", speed: "50 Mbps", price: "1800", durationDays: 30 },
    ]);
    console.log("✅ Sample packages created");
  } else {
    console.log("ℹ️  Packages exist, skipping.");
  }

  // 3. Default settings
  const defaultSettings = [
    { key: "bkash_number", value: "01712345678" },
    { key: "nagad_number", value: "01812345678" },
    { key: "rocket_number", value: "01912345678" },
    { key: "system_name", value: "NexusBill ISP" },
    { key: "website_logo", value: "" },
  ];

  for (const setting of defaultSettings) {
    const ex = await db.query.settings.findFirst({ where: eq(schema.settings.key, setting.key) });
    if (!ex) {
      await db.insert(schema.settings).values(setting);
    }
  }
  console.log("✅ Default settings created");

  // 4. Main MikroTik router (client's router)
  const existingRouter = await db.query.mikrotiks.findFirst();
  if (!existingRouter) {
    await db.insert(schema.mikrotiks).values({
      name: "Main Router (bd2.mikrovpn.xyz)",
      ipAddress: "bd2.mikrovpn.xyz",
      apiPort: 13065,
      username: "admin",
      password: "admin",
      status: true,
    });
    console.log("✅ Main MikroTik router added");
  }

  // 5. Sample notice
  const existingNotice = await db.query.notices.findFirst();
  if (!existingNotice) {
    await db.insert(schema.notices).values({
      title: "Welcome to NexusBill ISP!",
      message: "আমাদের ISP সিস্টেমে স্বাগতম। যেকোনো সমস্যায় Support এ টিকেট দিন।",
      type: "general",
    });
    console.log("✅ Sample notice created");
  }

  // 6. Default SMS Templates
  const defaultSmsTemplates = [
    { key: "payment_success", template: "Dear {name}, we have received your payment of Tk {amount}. Your account is now active until {expire_date}. Thank you for choosing us!", description: "Sent automatically when a payment is approved" },
    { key: "billing_reminder", template: "Dear {name}, this is a reminder that your internet bill of Tk {amount} is due on {due_date}. Please pay to avoid disconnection.", description: "Sent as billing reminder" },
    { key: "connection_expiry", template: "Dear {name}, your internet connection has expired. Please recharge Tk {amount} to resume service. Contact: {contact}.", description: "Sent when connection expires" },
    { key: "custom_message", template: "Dear customer, {message}", description: "Default manual/custom SMS template" },
  ];

  for (const t of defaultSmsTemplates) {
    const ex = await db.query.smsTemplates.findFirst({ where: eq(schema.smsTemplates.key, t.key) });
    if (!ex) {
      await db.insert(schema.smsTemplates).values(t);
      console.log(`✅ Default SMS template created: ${t.key}`);
    }
  }

  console.log("\n🎉 Seed / Password Reset complete!");
  console.log("   Super Admin Portal: phone=01800000000, password=password123");
  console.log("   Admin Portal:       phone=01700000000, password=password123");
  console.log("   Customer Portal:    phone=01618721061, password=password123 (Pronoy Saha)");
  console.log("   Reseller Portal:    phone=01900000000, password=password123");
  console.log("   Employee Portal:    phone=01600000000, password=password123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
