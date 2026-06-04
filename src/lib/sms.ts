/**
 * SMS Notification Library — SSL Wireless / BDBulkSMS
 * Reads API credentials from the `settings` database table.
 * Falls back gracefully if not configured.
 */

import { db } from "@/db";
import { settings, smsLogs, smsTemplates as dbSmsTemplates, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface SMSResult {
  success: boolean;
  message?: string;
  error?: string;
}

async function getSetting(key: string, adminId: number): Promise<string | null> {
  try {
    const row = await db.query.settings.findFirst({
      where: and(eq(settings.key, key), eq(settings.adminId, adminId))
    });
    return row?.value || null;
  } catch {
    return null;
  }
}

/**
 * Send an SMS via SSL Wireless API
 */
async function sendViaSslWireless(
  phone: string,
  message: string,
  apiKey: string,
  senderId: string
): Promise<SMSResult> {
  // Normalize phone — remove leading 0, add +880
  let normalizedPhone = phone.replace(/\s+/g, "").replace(/^0/, "88");
  if (!normalizedPhone.startsWith("88")) {
    normalizedPhone = "88" + normalizedPhone;
  }

  const url = "https://sms.sslwireless.com/pushapi/dynamic/server.php";
  const params = new URLSearchParams({
    api_token: apiKey,
    sid: senderId,
    msisdn: normalizedPhone,
    sms: message,
    csmsid: `isp-${Date.now()}`,
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`SSL Wireless API error: ${response.status}`);
  }

  const text = await response.text();
  // SSL Wireless returns 1000 for success
  if (text.includes("1000") || text.includes("success")) {
    return { success: true, message: "SMS sent via SSL Wireless" };
  }

  return { success: false, error: `SSL Wireless response: ${text}` };
}

/**
 * Send an SMS via BDBulkSMS API
 */
async function sendViaBdBulkSms(
  phone: string,
  message: string,
  apiKey: string,
  senderId: string
): Promise<SMSResult> {
  let normalizedPhone = phone.replace(/\s+/g, "").replace(/^0/, "88");
  if (!normalizedPhone.startsWith("88")) {
    normalizedPhone = "88" + normalizedPhone;
  }

  const response = await fetch("https://api.bdbulksms.net/sms.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      type: "text",
      contacts: normalizedPhone,
      senderid: senderId,
      msg: message,
    }),
  });

  if (!response.ok) {
    throw new Error(`BDBulkSMS API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.status === "success" || data.code === "200") {
    return { success: true, message: "SMS sent via BDBulkSMS" };
  }

  return { success: false, error: `BDBulkSMS response: ${JSON.stringify(data)}` };
}

/**
 * Main SMS send function — reads provider config from DB settings
 * Usage: await sendSMS("01700000000", "Your message here");
 */
export async function sendSMS(
  phone: string,
  message: string,
  type: string = "manual",
  adminId?: number
): Promise<SMSResult> {
  if (!phone || !message) {
    return { success: false, error: "Phone or message is empty" };
  }

  try {
    // Always use adminId = 1 for global SMS settings (shared system)
    const targetAdminId = 1;

    const provider = await getSetting("sms_provider", targetAdminId);
    const apiKey = await getSetting("sms_api_key", targetAdminId);
    const senderId = await getSetting("sms_sender_id", targetAdminId);

    // If not configured, log and return (non-blocking)
    if (!apiKey || !senderId || !provider) {
      console.log(`[SMS] Not configured. Would send to ${phone}: ${message}`);
      try {
        await db.insert(smsLogs).values({
          phone,
          message,
          type,
          status: "failed",
        });
      } catch (logErr) {
        console.error("[SMS Log Error]:", logErr);
      }
      return { success: false, error: "SMS not configured" };
    }

    let result: SMSResult;
    if (provider === "ssl_wireless") {
      result = await sendViaSslWireless(phone, message, apiKey, senderId);
    } else if (provider === "bdbulksms") {
      result = await sendViaBdBulkSms(phone, message, apiKey, senderId);
    } else {
      result = { success: false, error: `Unknown provider: ${provider}` };
    }

    try {
      await db.insert(smsLogs).values({
        phone,
        message,
        type,
        status: result.success ? "sent" : "failed",
      });
    } catch (logErr) {
      console.error("[SMS Log Error]:", logErr);
    }

    return result;
  } catch (error) {
    console.error("[SMS] Error:", error);
    try {
      await db.insert(smsLogs).values({
        phone,
        message,
        type,
        status: "failed",
      });
    } catch (logErr) {
      console.error("[SMS Log Error]:", logErr);
    }
    return { success: false, error: String(error) };
  }
}

/**
 * Send SMS to multiple phones at once
 */
export async function sendBulkSMS(
  phones: string[],
  message: string,
  type: string = "bulk",
  adminId?: number
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const phone of phones) {
    const result = await sendSMS(phone, message, type, adminId);
    if (result.success) sent++;
    else failed++;
    // Small delay to avoid API rate limits
    await new Promise((r) => setTimeout(r, 100));
  }

  return { sent, failed };
}

/**
 * Pre-built SMS message templates (with dynamic DB lookup capability)
 */
export async function getFormattedTemplate(
  key: string,
  replacements: Record<string, string>,
  adminId?: number
): Promise<string> {
  try {
    const row = await db.query.smsTemplates.findFirst({
      where: eq(dbSmsTemplates.key, key),
    });
    let tmpl = row?.template;

    if (!tmpl) {
      // Fallback hardcoded defaults if not in DB
      const fallbacks: Record<string, string> = {
        paymentApproved: "প্রিয় {name}, আপনার ৳{amount} টাকার বিল সফলভাবে গ্রহণ করা হয়েছে। মেয়াদ: {expDate}। ধন্যবাদ।",
        paymentPending: "প্রিয় {name}, আপনার ৳{amount} টাকার বিল পেমেন্ট যাচাই করা হচ্ছে। শীঘ্রই আপডেট পাবেন।",
        connectionExpired: "প্রিয় {name}, আপনার ইন্টারনেট সংযোগের মেয়াদ শেষ হয়েছে। পুনরায় সংযোগ চালু করতে দ্রুত বিল পরিশোধ করুন।",
        expiryReminder: "প্রিয় {name}, আপনার ইন্টারনেট সংযোগের মেয়াদ {expDate} তারিখে শেষ হবে। সংযোগ চালু রাখতে দ্রুত বিল পরিশোধ করুন।",
        registrationApproved: "প্রিয় {name}, আপনার অ্যাকাউন্ট সফলভাবে অনুমোদিত হয়েছে। এখন আপনি পোর্টালে লগইন করতে পারবেন।",
        resellerCreditAdded: "প্রিয় {name}, আপনার ওয়ালেটে ৳{amount} যোগ করা হয়েছে। বর্তমান ব্যালেন্স: ৳{balance}।",
      };
      tmpl = fallbacks[key] || "";
    }

    let formatted = tmpl;
    for (const [k, v] of Object.entries(replacements)) {
      formatted = formatted.replace(new RegExp(`{${k}}`, "g"), v);
    }
    return formatted;
  } catch (err) {
    console.error("Error formatting SMS template:", err);
    return "";
  }
}

export const smsTemplates = {
  paymentApproved: (name: string, amount: string, expDate: string) =>
    `প্রিয় ${name}, আপনার ৳${amount} টাকার বিল সফলভাবে গ্রহণ করা হয়েছে। মেয়াদ: ${expDate}। ধন্যবাদ।`,

  paymentPending: (name: string, amount: string) =>
    `প্রিয় ${name}, আপনার ৳${amount} টাকার বিল পেমেন্ট যাচাই করা হচ্ছে। শীঘ্রই আপডেট পাবেন।`,

  connectionExpired: (name: string) =>
    `প্রিয় ${name}, আপনার ইন্টারনেট সংযোগের মেয়াদ শেষ হয়েছে। পুনরায় সংযোগ চালু করতে দ্রুত বিল পরিশোধ করুন।`,

  expiryReminder: (name: string, expDate: string) =>
    `প্রিয় ${name}, আপনার ইন্টারনেট সংযোগের মেয়াদ ${expDate} তারিখে শেষ হবে। সংযোগ চালু রাখতে দ্রুত বিল পরিশোধ করুন।`,

  registrationApproved: (name: string) =>
    `প্রিয় ${name}, আপনার অ্যাকাউন্ট সফলভাবে অনুমোদিত হয়েছে। এখন আপনি পোর্টালে লগইন করতে পারবেন।`,

  resellerCreditAdded: (name: string, amount: string, balance: string) =>
    `প্রিয় ${name}, আপনার ওয়ালেটে ৳${amount} যোগ করা হয়েছে। বর্তমান ব্যালেন্স: ৳${balance}।`,
};
