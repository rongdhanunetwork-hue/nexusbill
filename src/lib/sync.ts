import { db } from "@/db";
import { users, mikrotiks, packages, dataUsage } from "@/db/schema";
import { eq, and, lte, gte, isNull } from "drizzle-orm";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { 
  getPppoeSecrets, 
  getPppoeActive, 
  createPppoeSecret, 
  updatePppoeSecret, 
  deletePppoeSecret, 
  getPppoeProfiles,
  getPppoeInterfaces,
  PppoeSecret,
  suspendUsers,
  disconnectPppoeActive
} from "./mikrotik";

const globalForSync = globalThis as typeof globalThis & {
  __isSyncingSecrets?: boolean;
};

export async function syncMikrotikSecrets(passedSecrets?: PppoeSecret[], routerId?: number | null, isInitialImport = false) {
  console.log(`[Sync Debug] syncMikrotikSecrets called: routerId=${routerId}, isInitialImport=${isInitialImport}, passedSecrets=${!!passedSecrets}`);
  try {
    if (routerId === undefined && !passedSecrets) {
      // Run for all active routers in the database!
      const activeRouters = await db.select({ id: mikrotiks.id }).from(mikrotiks).where(eq(mikrotiks.status, true));
      for (const router of activeRouters) {
        await syncMikrotikSecrets(undefined, router.id, isInitialImport).catch((err) => {
          console.warn(`Error syncing secrets for router ${router.id}:`, err);
        });
      }
      // Also run for default router (routerId = null)
      await syncMikrotikSecrets(undefined, null, isInitialImport).catch((err) => {
        console.warn("Error syncing default router secrets:", err);
      });
      return;
    }

    // Global lock to prevent concurrent duplication
    if (globalForSync.__isSyncingSecrets) {
      console.log(`[Sync] Sync already in progress, skipping concurrent execution.`);
      return;
    }
    globalForSync.__isSyncingSecrets = true;

    try {
      // 1. Fetch secrets from MikroTik
      const secrets = passedSecrets || await getPppoeSecrets(routerId || undefined);
      
      // 2. Get the adminId of the router
      let routerAdminId = 1;
      if (routerId) {
        const routerRow = await db.query.mikrotiks.findFirst({
          where: eq(mikrotiks.id, routerId),
          columns: { adminId: true }
        });
        routerAdminId = routerRow?.adminId || 1;
      }

      // 3. Fetch customers from DB for this Admin to prevent duplicates
      const dbCustomers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            eq(users.adminId, routerAdminId)
          )
        );

      const finalRouterId = routerId || null;

      const defaultHashedPassword =
        "$2b$12$9mgzlniYFoY0qfZF1Xyx0OXTPULdCMzpvV4ha2334CDP1ZVxbOwKm"; // password123

      for (const secret of secrets) {
        // Find if this secret name is already registered as a PPPoE username
        const exists = dbCustomers.find(
          (c) => c.pppoeUsername?.toLowerCase() === secret.name.toLowerCase()
        );

        if (exists) {
          // Prevent Router Hijacking: if customer is already assigned to a different router, ignore this secret
          if (exists.mikrotikId !== null && exists.mikrotikId !== finalRouterId) {
            console.warn(`[Sync] Conflict: Secret "${secret.name}" found on router ${finalRouterId}, but mapped to router ${exists.mikrotikId}. Skipping.`);
            continue;
          }

          // Update mikrotikId in DB if it was previously null
          if (exists.mikrotikId === null) {
            await db.update(users).set({ mikrotikId: finalRouterId }).where(eq(users.id, exists.id));
          }

          // ENFORCE DB STATUS ON MIKROTIK (Self-Healing)
          const routerExpired = secret.disabled === "true";
          const dbExpired = exists.status === "expired";
          
          if (routerExpired !== dbExpired) {
            console.log(`[Sync Enforcer] Fixing status for ${secret.name}. DB is ${exists.status}, Router is disabled=${routerExpired}`);
            try {
              await updatePppoeSecret(secret[".id"], { disabled: dbExpired ? "yes" : "no" }, finalRouterId || undefined);
              
              if (dbExpired) {
                // Kick them out immediately if they should be expired
                const activeSessions = await getPppoeActive(finalRouterId || undefined);
                const session = activeSessions.find(s => s.name.toLowerCase() === secret.name.toLowerCase());
                if (session) await disconnectPppoeActive(session[".id"], finalRouterId || undefined);
              }
            } catch (err) {
              console.warn(`[Sync Enforcer] Failed to fix status for ${secret.name}:`, err);
            }
          }
        } else {
          // If not registered, automatically import it
          // Ensure a unique phone number (use the secret name or append random suffix)
          const allDbCustomers = await db.select({ phone: users.phone }).from(users).where(eq(users.role, "customer"));
          const phoneExists = allDbCustomers.some(
            (c) => c.phone.toLowerCase() === secret.name.toLowerCase()
          );
          const uniquePhone = phoneExists 
            ? `${secret.name}-${Math.floor(1000 + Math.random() * 9000)}`
            : secret.name;

          const rawPassword = secret.password || "password123";
          const hashedPassword = await bcrypt.hash(rawPassword, 12);

          await db.insert(users).values({
            name: secret.name,
            phone: uniquePhone,
            password: hashedPassword,
            pppoeUsername: secret.name,
            status: secret.disabled === "true" ? "expired" : "active",
            role: "customer",
            approvalStatus: "approved",
            mikrotikId: finalRouterId,
            adminId: routerAdminId,
          }).onConflictDoNothing();
        }
      }
    } finally {
      globalForSync.__isSyncingSecrets = false;
    }
  } catch (err) {
    console.warn("Auto-sync MikroTik secrets error:", err);
  }
}

/**
 * Syncs a database customer creation/update to the MikroTik router.
 */
export async function syncCustomerToMikrotik(
  pppoeUsername: string,
  plainTextPassword?: string,
  packageId?: number | null,
  status?: string | null,
  routerId?: number | null
) {
  try {
    // 1. Fetch user from DB to find routerId and adminId if not passed
    const user = await db.query.users.findFirst({
      where: eq(users.pppoeUsername, pppoeUsername),
      columns: { mikrotikId: true, adminId: true }
    });
    const finalRouterId = routerId || user?.mikrotikId || undefined;

    if (finalRouterId === undefined && user?.adminId && user.adminId !== 1) {
      console.log(`Skipping Mikrotik sync for "${pppoeUsername}" because adminId ${user.adminId} has no assigned router and is not allowed to use the default router.`);
      return;
    }

    // 2. Fetch secrets to check if this user already exists
    const secrets = await getPppoeSecrets(finalRouterId);
    const existingSecret = secrets.find(s => s.name.toLowerCase() === pppoeUsername.toLowerCase());

    // 3. Fetch package speed to map to router profile
    let profile = existingSecret ? existingSecret.profile : "default";
    if (packageId) {
      const pkg = await db.query.packages.findFirst({ where: eq(packages.id, Number(packageId)) });
      if (pkg) {
        // Normalize speed, e.g. "10 Mbps" -> "10mbps"
        const normSpeed = pkg.speed.toLowerCase().replace(/\s+/g, "");
        // Extract just the number from speed, e.g. "10 Mbps" -> "10"
        const speedNumber = pkg.speed.replace(/[^0-9]/g, "");
        try {
          const routerProfiles = await getPppoeProfiles(finalRouterId);
          
          // Strategy 0: Exact match on package name (since packages are synced from Mikrotik profiles)
          const nameMatch = routerProfiles.find(p => p.name.toLowerCase() === pkg.name.toLowerCase());
          
          // Strategy 1: Exact match on normalized speed (e.g. "10mbps")
          const exactMatch = routerProfiles.find(p => p.name.toLowerCase() === normSpeed);
          
          if (nameMatch) {
            profile = nameMatch.name;
          } else if (exactMatch) {
            profile = exactMatch.name;
          } else if (speedNumber) {
            // Strategy 2: Match by speed number pattern (e.g. "10" matches "10M-POOL", "10mbps", "10M")
            // Look for profiles that start with the speed number followed by a non-digit
            const numberMatch = routerProfiles.find(p => {
              const pName = p.name.toLowerCase();
              // Skip "default", "default-encryption", "Expired", "Block" etc.
              if (pName === "default" || pName === "default-encryption" || pName === "expired" || pName === "block") return false;
              // Check if profile name starts with the speed number
              const profileNumber = p.name.replace(/[^0-9]/g, "");
              return profileNumber === speedNumber;
            });
            
            if (numberMatch) {
              profile = numberMatch.name;
              console.log(`[Sync] Profile matched by speed number: "${pkg.speed}" → "${numberMatch.name}" on router ${finalRouterId}`);
            } else {
              console.log(`[Sync] ⚠️ No matching profile found for speed "${pkg.speed}" (normalized: "${normSpeed}", number: "${speedNumber}") on router ${finalRouterId}. Available profiles: ${routerProfiles.map(p => p.name).join(', ')}`);
            }
          }
        } catch (err) {
          console.warn("Failed to fetch router profiles in syncCustomerToMikrotik:", err);
        }
      }
    }

    const isDisabled = (status && status !== "active" && status !== "online") ? "true" : "false";

    if (existingSecret) {
      // Update existing secret on MikroTik
      const updateData: any = {
        profile,
        disabled: isDisabled,
      };
      if (plainTextPassword) {
        updateData.password = plainTextPassword;
      }
      await updatePppoeSecret(existingSecret[".id"], updateData, finalRouterId);
      console.log(`Successfully updated MikroTik secret for "${pppoeUsername}" on router ${finalRouterId}`);
    } else {
      // Create new secret on MikroTik
      await createPppoeSecret({
        name: pppoeUsername,
        password: plainTextPassword || "password123",
        profile,
        comment: "Created from Billing Software",
        disabled: isDisabled,
      }, finalRouterId);
      console.log(`Successfully created MikroTik secret for "${pppoeUsername}" on router ${finalRouterId}`);
    }

    // Force disconnect active session to apply changes (status / speed profile) instantly
    try {
      const activeSessions = await getPppoeActive(finalRouterId);
      const sessions = activeSessions.filter(
        (s) => s.name.toLowerCase() === pppoeUsername.toLowerCase()
      );
      for (const session of sessions) {
        await disconnectPppoeActive(session[".id"], finalRouterId);
        console.log(`Kicked active session for "${pppoeUsername}" to apply changes instantly on router ${finalRouterId}.`);
      }
    } catch (err) {
      console.warn(`Failed to disconnect active session for "${pppoeUsername}" on router ${finalRouterId}:`, err);
    }
  } catch (err) {
    console.warn(`Failed to sync customer "${pppoeUsername}" to MikroTik:`, err);
    throw err; // Important: throw the error so callers know the sync failed!
  }
}

export async function syncDeleteCustomerFromMikrotik(pppoeUsername: string, routerId?: number | null, excludeIds?: number[]) {
  try {
    // 1. Safety check to prevent deleting secrets that are still in use by other customers (e.g., due to duplicate PPPoE usernames)
    if (pppoeUsername) {
      let countQuery;
      if (excludeIds && excludeIds.length > 0) {
        // Find if there are any other customers using this PPPoE username EXCEPT the ones being deleted
        const { notInArray, eq, and, sql } = require("drizzle-orm");
        countQuery = db.select({ count: sql<number>`cast(count(*) as int)` })
          .from(users)
          .where(and(eq(users.pppoeUsername, pppoeUsername), notInArray(users.id, excludeIds)));
      } else {
        // If excludeIds is not provided, we assume this is called BEFORE db.delete. 
        // So there should be at most 1 user (the one being deleted) for it to be safe to delete.
        const { eq, sql } = require("drizzle-orm");
        countQuery = db.select({ count: sql<number>`cast(count(*) as int)` })
          .from(users)
          .where(eq(users.pppoeUsername, pppoeUsername));
      }

      const countResult = await countQuery;
      const count = countResult[0]?.count || 0;
      const threshold = (excludeIds && excludeIds.length > 0) ? 0 : 1;

      if (count > threshold) {
        console.log(`[Safety Check] Skipping MikroTik secret deletion for "${pppoeUsername}". Reason: ID is still in use by other active customers in the database.`);
        return;
      }
    }

    const user = await db.query.users.findFirst({
      where: eq(users.pppoeUsername, pppoeUsername),
      columns: { mikrotikId: true, adminId: true }
    });
    
    const finalRouterId = routerId !== undefined ? (routerId || undefined) : user?.mikrotikId || undefined;

    if (finalRouterId === undefined && user?.adminId && user.adminId !== 1) {
      console.log(`Skipping Mikrotik delete sync for "${pppoeUsername}" because adminId ${user.adminId} has no assigned router and is not allowed to use the default router.`);
      return;
    }

    const secrets = await getPppoeSecrets(finalRouterId);
    const existingSecret = secrets.find(s => s.name.toLowerCase() === pppoeUsername.toLowerCase());
    
    if (existingSecret) {
      await deletePppoeSecret(existingSecret[".id"], finalRouterId);
      console.log(`Successfully deleted MikroTik secret for "${pppoeUsername}" on router ${finalRouterId}`);
    }
  } catch (err) {
    console.warn(`Failed to delete MikroTik secret for "${pppoeUsername}":`, err);
  }
}

export async function checkAndSuspendExpiredUsers() {
  try {
    const now = new Date();
    // Fetch all active customers whose expireDate <= now
    const { packages } = await import("@/db/schema");
    const expiredUsersRaw = await db
      .select({
        user: users,
        package: packages,
      })
      .from(users)
      .leftJoin(packages, eq(users.packageId, packages.id))
      .where(
        and(
          eq(users.role, "customer"),
          eq(users.status, "active"),
          lte(users.expireDate, now)
        )
      );

    const expiredUsers = expiredUsersRaw.map(r => ({
      ...r.user,
      package: r.package
    }));

    if (expiredUsers.length === 0) return;

    console.log(`[Expiration Checker] Found ${expiredUsers.length} expired users to suspend.`);

    // Group users by their mikrotikId
    const usersByRouter: Record<number, typeof expiredUsers> = {};
    for (const user of expiredUsers) {
      const rId = user.mikrotikId || 0;
      if (!usersByRouter[rId]) {
        usersByRouter[rId] = [];
      }
      usersByRouter[rId].push(user);
    }

    const successfullySuspendedIds = new Set<number>();

    for (const [routerIdStr, rUsers] of Object.entries(usersByRouter)) {
      const routerId = Number(routerIdStr) || undefined;
      const pppoeUsernames = rUsers
        .map(u => u.pppoeUsername)
        .filter((username): username is string => !!username);

      if (pppoeUsernames.length > 0) {
        try {
          await suspendUsers(pppoeUsernames, routerId);
          // If no error thrown, assume success for all users on this router
          for (const u of rUsers) successfullySuspendedIds.add(u.id);
        } catch (e) {
          console.warn(`[Expiration Checker] Failed to suspend users on router ${routerId}:`, e);
        }
      } else {
        // Users without PPPoE username can be marked expired immediately
        for (const u of rUsers) successfullySuspendedIds.add(u.id);
      }
    }

    const { invoices } = await import("@/db/schema");

    // Update database status to "expired" ONLY for successfully suspended users
    for (const user of expiredUsers) {
      if (!successfullySuspendedIds.has(user.id)) {
        console.warn(`[Expiration Checker] Skipping DB expiration for ${user.name} because Mikrotik suspension failed.`);
        continue;
      }

      await db
        .update(users)
        .set({ status: "expired" })
        .where(eq(users.id, user.id));

      if (user.package) {
        try {
          await db.insert(invoices).values({
            userId: user.id,
            amount: String(user.package.price || 0),
            status: "unpaid",
            createdAt: now,
            dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          });
        } catch (e) {
          console.warn(`[Expiration Checker] Failed to create unpaid invoice for ${user.id}:`, e);
        }
      }

      console.log(`[Expiration Checker] Suspended user: ${user.name} (PPPoE: ${user.pppoeUsername || "N/A"})`);
    }
  } catch (err) {
    console.warn("[Expiration Checker] Error checking expired users:", err);
  }
}

const CACHE_FILE = path.resolve(process.cwd(), "session_traffic_cache.json");

function loadSessionCache(): Map<string, { bytesIn: number; bytesOut: number; uptime: string }> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (err) {
    console.warn("Failed to load session traffic cache:", err);
  }
  return new Map();
}

function saveSessionCache(cache: Map<string, { bytesIn: number; bytesOut: number; uptime: string }>) {
  try {
    const obj = Object.fromEntries(cache.entries());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save session traffic cache:", err);
  }
}

const lastSessionTraffic = loadSessionCache();

function parseUptimeToSeconds(uptime: string): number {
  if (!uptime) return 0;
  let total = 0;
  const wMatch = uptime.match(/(\d+)w/);
  const dMatch = uptime.match(/(\d+)d/);
  const hMatch = uptime.match(/(\d+)h/);
  const mMatch = uptime.match(/(\d+)m/);
  const sMatch = uptime.match(/(\d+)s/);

  if (wMatch) total += parseInt(wMatch[1]) * 604800;
  if (dMatch) total += parseInt(dMatch[1]) * 86400;
  if (hMatch) total += parseInt(hMatch[1]) * 3600;
  if (mMatch) total += parseInt(mMatch[1]) * 60;
  if (sMatch) total += parseInt(sMatch[1]);

  return total;
}

export async function trackCustomerDataUsage() {
  try {
    const routers = await db.select().from(mikrotiks).where(eq(mikrotiks.status, true));
    for (const router of routers) {
      await trackRouterUsage(router.id);
    }
    
    // Also track the default router (undefined routerId) if there are customers assigned to it
    const hasDefaultCustomers = await db.query.users.findFirst({
      where: and(eq(users.role, "customer"), isNull(users.mikrotikId))
    });
    if (hasDefaultCustomers) {
      await trackRouterUsage(undefined);
    }
  } catch (err) {
    console.warn("trackCustomerDataUsage error:", err);
  }
}

async function trackRouterUsage(routerId?: number) {
  try {
    const activeSessions = await getPppoeActive(routerId);
    if (!activeSessions || activeSessions.length === 0) return;

    // Fetch interfaces to get actual traffic bytes
    let interfaces: any[] = [];
    try {
      interfaces = await getPppoeInterfaces(routerId);
    } catch (e) {
      console.warn("Failed to fetch interfaces, skipping traffic usage but proceeding with enforcer:", e);
    }
    const ifaceMap = new Map<string, any>();
    for (const iface of interfaces) {
      if (iface.name) {
        ifaceMap.set(iface.name.toLowerCase(), iface);
      }
    }

    // Fetch customers assigned to this router
    const dbCustomers = await db
      .select({ id: users.id, pppoeUsername: users.pppoeUsername, status: users.status, expireDate: users.expireDate })
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          routerId 
            ? eq(users.mikrotikId, routerId) 
            : and(isNull(users.mikrotikId), eq(users.adminId, 1))
        )
      );

    const usernameToUser = new Map<string, { id: number; status: string | null; expireDate: Date | null }>();
    for (const c of dbCustomers) {
      if (c.pppoeUsername) {
        usernameToUser.set(c.pppoeUsername.toLowerCase(), { id: c.id, status: c.status, expireDate: c.expireDate });
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    for (const session of activeSessions) {
      const username = session.name;
      if (!username) continue;
      
      const user = usernameToUser.get(username.toLowerCase());
      if (!user) continue;

      // --- SELF HEALING ENFORCER ---
      // If the user's DB status is NOT active/online, OR their package has expired, they shouldn't be connected!
      const isExpired = user.expireDate && new Date(user.expireDate) < new Date();
      if ((user.status && user.status !== "active" && user.status !== "online") || isExpired) {
        console.log(`[Self-Healing] Disconnecting ${username} because DB status is '${user.status}' or they are expired.`);
        try {
          await disconnectPppoeActive(session[".id"], routerId);
          // ensure secret is disabled
          await syncCustomerToMikrotik(username, undefined, undefined, "expired", routerId);
        } catch (e) {
          console.warn(`[Self-Healing] Failed to kick ${username}:`, e);
        }
        continue;
      }
      // ----------------------------

      const userId = user.id;

      const ifaceName = `<pppoe-${username}>`.toLowerCase();
      const iface = ifaceMap.get(ifaceName) || ifaceMap.get(`pppoe-${username.toLowerCase()}`);
      
      const currentBytesIn = parseInt((iface && iface["rx-byte"]) ? iface["rx-byte"] : "0");
      const currentBytesOut = parseInt((iface && iface["tx-byte"]) ? iface["tx-byte"] : "0");
      const currentUptime = session.uptime || "";

      // Differentiate sessions on different routers if usernames ever collide
      const trafficKey = `${routerId || 0}-${username.toLowerCase()}`;
      const prev = lastSessionTraffic.get(trafficKey);
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
        // If this is the first time we see this session, and it just started (uptime < 60s),
        // we can count its current bytes as the delta because it's a brand new session.
        const currentUptimeSecs = parseUptimeToSeconds(currentUptime);
        if (currentUptimeSecs < 60) {
          deltaIn = currentBytesIn;
          deltaOut = currentBytesOut;
        } else {
          deltaIn = 0;
          deltaOut = 0;
        }
      }

      lastSessionTraffic.set(trafficKey, {
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
              downloadGb: (prevDlGb + deltaDlGb).toFixed(9),
              uploadGb: (prevUlGb + deltaUlGb).toFixed(9),
            })
            .where(eq(dataUsage.id, existing.id));
        } else {
          await db.insert(dataUsage).values({
            userId,
            downloadGb: deltaDlGb.toFixed(9),
            uploadGb: deltaUlGb.toFixed(9),
            recordedAt: new Date(),
          });
        }
      }
    }
    if (activeSessions.length > 0) {
      saveSessionCache(lastSessionTraffic);
    }
  } catch (err) {
    console.warn(`trackRouterUsage error for router ${routerId}:`, err);
  }
}

// Use a global variable to prevent multiple intervals during HMR in dev mode
declare global {
  var _expirationCheckerInterval: NodeJS.Timeout | undefined;
}

export function startExpirationChecker() {
  if (global._expirationCheckerInterval) {
    clearInterval(global._expirationCheckerInterval);
  }

  console.log("[Expiration Checker] Initializing background tasks (runs every 30s)...");
  // Run immediately on boot
  checkAndSuspendExpiredUsers().catch(err => {
    console.warn("[Expiration Checker] Initial run failed:", err);
  });
  trackCustomerDataUsage().catch(err => {
    console.warn("[Data Usage Accumulator] Initial run failed:", err);
  });

  // Setup interval
  global._expirationCheckerInterval = setInterval(() => {
    checkAndSuspendExpiredUsers().catch(err => {
      console.warn("[Expiration Checker] Interval run failed:", err);
    });
    trackCustomerDataUsage().catch(err => {
      console.warn("[Data Usage Accumulator] Interval run failed:", err);
    });
  }, 30000); // 30 seconds
}
