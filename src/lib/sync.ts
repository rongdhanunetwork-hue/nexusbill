import { db } from "@/db";
import { users, mikrotiks, packages, dataUsage } from "@/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { 
  getPppoeSecrets, 
  getPppoeActive, 
  createPppoeSecret, 
  updatePppoeSecret, 
  deletePppoeSecret, 
  getPppoeProfiles,
  PppoeSecret,
  suspendUsers
} from "./mikrotik";

export async function syncMikrotikSecrets(passedSecrets?: PppoeSecret[]) {
  try {
    // 1. Fetch secrets from MikroTik
    const secrets = passedSecrets || await getPppoeSecrets();
    
    // 2. Fetch customers from DB
    const dbCustomers = await db
      .select()
      .from(users)
      .where(eq(users.role, "customer"));

    // 3. Find first registered router id to link the new customers to
    const firstRouter = await db.select({ id: mikrotiks.id }).from(mikrotiks).limit(1);
    const routerId = firstRouter[0]?.id || 1;

    const defaultHashedPassword =
      "$2b$12$9mgzlniYFoY0qfZF1Xyx0OXTPULdCMzpvV4ha2334CDP1ZVxbOwKm"; // password123

    for (const secret of secrets) {
      // Find if this secret name is already registered as a PPPoE username
      const exists = dbCustomers.find(
        (c) => c.pppoeUsername?.toLowerCase() === secret.name.toLowerCase()
      );

      if (exists) {
        // Sync status: if disabled on MikroTik, set status = expired in DB
        const routerExpired = secret.disabled === "true";
        const currentExpired = exists.status === "expired";
        
        if (routerExpired !== currentExpired) {
          await db
            .update(users)
            .set({ status: routerExpired ? "expired" : "active" })
            .where(eq(users.id, exists.id));
        }
      } else {
        // If not registered, automatically import it
        // Ensure a unique phone number (use the secret name or append random suffix)
        const phoneExists = dbCustomers.some(
          (c) => c.phone.toLowerCase() === secret.name.toLowerCase()
        );
        const uniquePhone = phoneExists 
          ? `${secret.name}-${Math.floor(1000 + Math.random() * 9000)}`
          : secret.name;

        await db.insert(users).values({
          name: secret.name,
          phone: uniquePhone,
          password: defaultHashedPassword,
          pppoeUsername: secret.name,
          status: secret.disabled === "true" ? "expired" : "active",
          role: "customer",
          approvalStatus: "approved",
          mikrotikId: routerId,
        });
      }
    }
  } catch (err) {
    console.error("Auto-sync MikroTik secrets error:", err);
  }
}

/**
 * Syncs a database customer creation/update to the MikroTik router.
 */
export async function syncCustomerToMikrotik(
  pppoeUsername: string,
  plainTextPassword?: string,
  packageId?: number | null,
  status?: string | null
) {
  try {
    // 1. Fetch package speed to map to router profile
    let profile = "default";
    if (packageId) {
      const pkg = await db.query.packages.findFirst({ where: eq(packages.id, Number(packageId)) });
      if (pkg) {
        // Normalize speed, e.g. "10 Mbps" -> "10mbps"
        const normSpeed = pkg.speed.toLowerCase().replace(/\s+/g, "");
        try {
          const routerProfiles = await getPppoeProfiles();
          const hasProfile = routerProfiles.some(p => p.name.toLowerCase() === normSpeed);
          if (hasProfile) {
            profile = normSpeed;
          }
        } catch (err) {
          console.error("Failed to fetch router profiles in syncCustomerToMikrotik:", err);
        }
      }
    }

    // 2. Fetch secrets to check if this user already exists
    const secrets = await getPppoeSecrets();
    const existingSecret = secrets.find(s => s.name.toLowerCase() === pppoeUsername.toLowerCase());

    const isDisabled = status === "expired" || status === "suspended" ? "true" : "false";

    if (existingSecret) {
      // Update existing secret on MikroTik
      const updateData: any = {
        profile,
        disabled: isDisabled,
      };
      if (plainTextPassword) {
        updateData.password = plainTextPassword;
      }
      await updatePppoeSecret(existingSecret[".id"], updateData);
      console.log(`Successfully updated MikroTik secret for "${pppoeUsername}"`);
    } else {
      // Create new secret on MikroTik
      await createPppoeSecret({
        name: pppoeUsername,
        password: plainTextPassword || "password123",
        profile,
        comment: "Created from Billing Software",
      });
      console.log(`Successfully created MikroTik secret for "${pppoeUsername}"`);
    }
  } catch (err) {
    console.error(`Failed to sync customer "${pppoeUsername}" to MikroTik:`, err);
  }
}

/**
 * Deletes a customer's PPPoE secret from the MikroTik router.
 */
export async function syncDeleteCustomerFromMikrotik(pppoeUsername: string) {
  try {
    const secrets = await getPppoeSecrets();
    const existingSecret = secrets.find(s => s.name.toLowerCase() === pppoeUsername.toLowerCase());
    
    if (existingSecret) {
      await deletePppoeSecret(existingSecret[".id"]);
      console.log(`Successfully deleted MikroTik secret for "${pppoeUsername}"`);
    }
  } catch (err) {
    console.error(`Failed to delete MikroTik secret for "${pppoeUsername}":`, err);
  }
}

export async function checkAndSuspendExpiredUsers() {
  try {
    const now = new Date();
    // Fetch all active customers whose expireDate <= now
    const expiredUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          eq(users.status, "active"),
          lte(users.expireDate, now)
        )
      );

    if (expiredUsers.length === 0) return;

    console.log(`[Expiration Checker] Found ${expiredUsers.length} expired users to suspend.`);

    // 1. Collect usernames to suspend on the router
    const pppoeUsernames = expiredUsers
      .map(u => u.pppoeUsername)
      .filter((username): username is string => !!username);

    // 2. Suspend them on the router in a single connection
    if (pppoeUsernames.length > 0) {
      await suspendUsers(pppoeUsernames);
    }

    // 3. Update database status to "expired" for these users
    for (const user of expiredUsers) {
      await db
        .update(users)
        .set({ status: "expired" })
        .where(eq(users.id, user.id));
      console.log(`[Expiration Checker] Suspended user: ${user.name} (PPPoE: ${user.pppoeUsername || "N/A"})`);
    }
  } catch (err) {
    console.error("[Expiration Checker] Error checking expired users:", err);
  }
}

const lastSessionTraffic = new Map<string, { bytesIn: number; bytesOut: number; uptime: string }>();

function parseUptimeToSeconds(uptime: string): number {
  if (!uptime) return 0;
  let days = 0;
  let timePart = uptime;
  if (uptime.includes("d")) {
    const parts = uptime.split("d");
    days = parseInt(parts[0]) || 0;
    timePart = parts[1] || "";
  }
  const hms = timePart.split(":");
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (hms.length === 3) {
    hours = parseInt(hms[0]) || 0;
    minutes = parseInt(hms[1]) || 0;
    seconds = parseInt(hms[2]) || 0;
  } else if (hms.length === 2) {
    minutes = parseInt(hms[0]) || 0;
    seconds = parseInt(hms[1]) || 0;
  } else if (hms.length === 1) {
    seconds = parseInt(hms[0]) || 0;
  }
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

export async function trackCustomerDataUsage() {
  try {
    // 1. Fetch active sessions from MikroTik
    const activeSessions = await getPppoeActive();
    if (!activeSessions || activeSessions.length === 0) return;

    // 2. Fetch all customers from DB to map pppoeUsername to userId
    const dbCustomers = await db
      .select({ id: users.id, pppoeUsername: users.pppoeUsername })
      .from(users)
      .where(eq(users.role, "customer"));

    const usernameToUserId = new Map<string, number>();
    for (const c of dbCustomers) {
      if (c.pppoeUsername) {
        usernameToUserId.set(c.pppoeUsername.toLowerCase(), c.id);
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    for (const session of activeSessions) {
      const username = session.name;
      if (!username) continue;
      const userId = usernameToUserId.get(username.toLowerCase());
      if (!userId) continue;

      const currentBytesIn = parseInt((session as any)["bytes-in"] || "0");
      const currentBytesOut = parseInt((session as any)["bytes-out"] || "0");
      const currentUptime = session.uptime || "";

      const prev = lastSessionTraffic.get(username.toLowerCase());
      let deltaIn = 0;
      let deltaOut = 0;

      if (prev) {
        const currentUptimeSecs = parseUptimeToSeconds(currentUptime);
        const prevUptimeSecs = parseUptimeToSeconds(prev.uptime);
        const isReset = currentBytesIn < prev.bytesIn || currentBytesOut < prev.bytesOut || currentUptimeSecs < prevUptimeSecs;

        if (isReset) {
          deltaIn = currentBytesIn;
          deltaOut = currentBytesOut;
        } else {
          deltaIn = currentBytesIn - prev.bytesIn;
          deltaOut = currentBytesOut - prev.bytesOut;
        }
      } else {
        deltaIn = 0;
        deltaOut = 0;
      }

      lastSessionTraffic.set(username.toLowerCase(), {
        bytesIn: currentBytesIn,
        bytesOut: currentBytesOut,
        uptime: currentUptime,
      });

      if (deltaIn > 0 || deltaOut > 0) {
        const deltaDlGb = deltaOut / (1024 * 1024 * 1024);
        const deltaUlGb = deltaIn / (1024 * 1024 * 1024);

        const existing = await db.query.dataUsage.findFirst({
          where: and(
            eq(dataUsage.userId, userId),
            gte(dataUsage.recordedAt, todayStart),
            lte(dataUsage.recordedAt, todayEnd)
          ),
        });

        if (existing) {
          const prevDlGb = parseFloat(String(existing.downloadGb || 0));
          const prevUlGb = parseFloat(String(existing.uploadGb || 0));
          await db
            .update(dataUsage)
            .set({
              downloadGb: (prevDlGb + deltaDlGb).toFixed(4),
              uploadGb: (prevUlGb + deltaUlGb).toFixed(4),
            })
            .where(eq(dataUsage.id, existing.id));
        } else {
          await db.insert(dataUsage).values({
            userId,
            downloadGb: deltaDlGb.toFixed(4),
            uploadGb: deltaUlGb.toFixed(4),
            recordedAt: new Date(),
          });
        }
      }
    }
  } catch (err) {
    console.error("trackCustomerDataUsage error:", err);
  }
}

export function startExpirationChecker() {
  console.log("[Expiration Checker] Initializing background tasks (runs every 30s)...");
  // Run immediately on boot
  checkAndSuspendExpiredUsers().catch(err => {
    console.error("[Expiration Checker] Initial run failed:", err);
  });
  trackCustomerDataUsage().catch(err => {
    console.error("[Data Usage Accumulator] Initial run failed:", err);
  });

  // Setup interval
  setInterval(() => {
    checkAndSuspendExpiredUsers().catch(err => {
      console.error("[Expiration Checker] Interval run failed:", err);
    });
    trackCustomerDataUsage().catch(err => {
      console.error("[Data Usage Accumulator] Interval run failed:", err);
    });
  }, 30000); // 30 seconds
}
