import { RouterOSAPI } from "node-routeros";
import { db } from "@/db";
import { mikrotiks } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getRouterConfig(routerId?: number) {
  if (routerId) {
    try {
      const router = await db.query.mikrotiks.findFirst({
        where: eq(mikrotiks.id, routerId),
      });
      if (router) {
        return {
          host: router.ipAddress,
          port: router.apiPort || 80,
          user: router.username,
          pass: router.password,
        };
      }
    } catch (err) {
      console.warn(`Failed to load router config for ID ${routerId}:`, err);
    }
  }
  return {
    host: process.env.MIKROTIK_HOST || "bd2.mikrovpn.xyz",
    port: parseInt(process.env.MIKROTIK_API_PORT || "13065"),
    user: process.env.MIKROTIK_USER || "admin",
    pass: process.env.MIKROTIK_PASS || "admin",
  };
}

async function getClient(routerId?: number) {
  const config = await getRouterConfig(routerId);
  const client = new RouterOSAPI({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.pass,
    timeout: parseInt(process.env.MIKROTIK_API_TIMEOUT || '8'),
  });
  client.on("error", (err) => {
    console.warn("MikroTik socket error caught:", err.message);
  });
  return client;
}

// ───── Types ─────────────────────────────────────────────

export interface PppoeSecret {
  ".id": string;
  name: string;
  password?: string;
  service?: string;
  profile?: string;
  disabled: string; // "true" | "false"
  comment?: string;
  [key: string]: any; // Allow indexing for other MikroTik properties like "last-logged-out"
}

export interface PppoeActive {
  ".id": string;
  name: string;
  service: string;
  "caller-id": string;
  address: string;
  uptime: string;
}

export interface SystemResource {
  "board-name": string;
  version: string;
  uptime: string;
  "cpu-load": string;
  "free-memory": string;
  "total-memory": string;
  "free-hdd-space": string;
  txBps?: number;
  rxBps?: number;
  txPps?: number;
  rxPps?: number;
}

export async function getSystemResource(routerId?: number): Promise<SystemResource | null> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const data = await client.write('/system/resource/print');
    
    let maxTx = 0;
    let maxRx = 0;
    let maxTxPkts = 0;
    let maxRxPkts = 0;
    try {
      const ifaces = await client.write(["/interface/print", "?running=true"]);
      
      // Filter out logical interfaces that aren't usually WANs
      const validIfaces = (ifaces as any[]).filter((i: any) => 
        i.type !== "pppoe-in" && i.type !== "bridge" && !i.type?.includes("-in")
      );
      
      // Sort by historical rx-byte to find the most likely WAN candidates (top 5)
      validIfaces.sort((a, b) => {
         const bA = parseInt(a["rx-byte"] || "0");
         const bB = parseInt(b["rx-byte"] || "0");
         return bB - bA;
      });
      
      const topCandidates = validIfaces.slice(0, 5).map(i => i.name).join(",");
      
      if (topCandidates.length > 0) {
        const stats = await client.write(["/interface/monitor-traffic", `=interface=${topCandidates}`, "=once=yes"]);
        
        let highestCurrentRx = -1;
        for (const s of stats as any[]) {
           const rx = parseInt(s["rx-bits-per-second"] || "0");
           const tx = parseInt(s["tx-bits-per-second"] || "0");
           const rxPkts = parseInt(s["rx-packets-per-second"] || "0");
           const txPkts = parseInt(s["tx-packets-per-second"] || "0");
           
           if (rx > highestCurrentRx) {
              highestCurrentRx = rx;
              maxRx = rx; 
              maxTx = tx; // DO NOT swap Rx and Tx to preserve actual graph data
              maxRxPkts = rxPkts; 
              maxTxPkts = txPkts;
           }
        }
      }
    } catch (trafficErr) {
       console.error("Traffic calc error:", trafficErr);
    }

    if (data && data.length > 0) {
      const res = data[0] as unknown as SystemResource;
      res.rxBps = maxRx;
      res.txBps = maxTx;
      res.rxPps = maxRxPkts;
      res.txPps = maxTxPkts;
      res.txBps = maxTx;
      return res;
    }
    return null;
  } catch (err) {
    console.warn('getSystemResource error:', err);
    return null;
  } finally {
    try { await client.close(); } catch {}
  }
}

// ───── PPPoE Secrets (user accounts) ─────────────────────

export async function getPppoeSecrets(routerId?: number): Promise<PppoeSecret[]> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const data = await client.write("/ppp/secret/print");
    return data as unknown as PppoeSecret[];
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function createPppoeSecret(data: {
  name: string;
  password: string;
  service?: string;
  profile?: string;
  comment?: string;
  disabled?: string | boolean;
}, routerId?: number): Promise<PppoeSecret> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const cmd = [
      "/ppp/secret/add",
      `=name=${data.name}`,
      `=password=${data.password}`,
      `=service=${data.service || "pppoe"}`,
      `=profile=${data.profile || "default"}`,
      `=comment=${data.comment || ""}`,
    ];
    if (data.disabled !== undefined) {
      const val = data.disabled === "true" || data.disabled === "yes" || data.disabled === true ? "yes" : "no";
      cmd.push(`=disabled=${val}`);
    }
    const created = await client.write(cmd);
    return created[0] as unknown as PppoeSecret;
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function updatePppoeSecret(id: string, data: Partial<PppoeSecret>, routerId?: number): Promise<void> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const cmd = [
      "/ppp/secret/set",
      `=.id=${id}`,
    ];
    if (data.name !== undefined) cmd.push(`=name=${data.name}`);
    if (data.password !== undefined) cmd.push(`=password=${data.password}`);
    if (data.profile !== undefined) cmd.push(`=profile=${data.profile}`);
    if (data.comment !== undefined) cmd.push(`=comment=${data.comment}`);
    if (data.disabled !== undefined) {
      const val = data.disabled === "true" || data.disabled === "yes" ? "yes" : "no";
      cmd.push(`=disabled=${val}`);
    }

    await client.write(cmd);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function deletePppoeSecret(id: string, routerId?: number): Promise<void> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    await client.write([
      "/ppp/secret/remove",
      `=.id=${id}`,
    ]);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function enablePppoeSecret(id: string, routerId?: number): Promise<void> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    await client.write([
      "/ppp/secret/set",
      `=.id=${id}`,
      "=disabled=no",
    ]);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function disablePppoeSecret(id: string, routerId?: number): Promise<void> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    await client.write([
      "/ppp/secret/set",
      `=.id=${id}`,
      "=disabled=yes",
    ]);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

// ───── Active PPPoE Sessions (currently online) ──────────

export async function getPppoeActive(routerId?: number): Promise<PppoeActive[]> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const data = await client.write("/ppp/active/print");
    return data as unknown as PppoeActive[];
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function getPppoeInterfaces(routerId?: number): Promise<any[]> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const data = await client.write(["/interface/print", "?type=pppoe-in"]);
    return data as any[];
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

// ───── PPPoE Profiles ──────────────────────────────────────

export interface PppoeProfile {
  ".id": string;
  name: string;
  "local-address"?: string;
  "remote-address"?: string;
  "rate-limit"?: string;
  "only-one"?: string;
}

export async function getPppoeProfiles(routerId?: number): Promise<PppoeProfile[]> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const data = await client.write("/ppp/profile/print");
    return data as unknown as PppoeProfile[];
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function createPppoeProfile(data: {
  name: string;
  localAddress?: string;
  remoteAddress?: string;
  rateLimit?: string;
}, routerId?: number): Promise<PppoeProfile> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const cmd = [
      "/ppp/profile/add",
      `=name=${data.name}`,
    ];
    if (data.localAddress) cmd.push(`=local-address=${data.localAddress}`);
    if (data.remoteAddress) cmd.push(`=remote-address=${data.remoteAddress}`);
    if (data.rateLimit) cmd.push(`=rate-limit=${data.rateLimit}`);
    cmd.push("=only-one=yes");
    const created = await client.write(cmd);
    return created[0] as unknown as PppoeProfile;
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function updatePppoeProfile(id: string, data: {
  name?: string;
  localAddress?: string;
  remoteAddress?: string;
  rateLimit?: string;
}, routerId?: number): Promise<void> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const cmd = [
      "/ppp/profile/set",
      `=.id=${id}`,
    ];
    if (data.name) cmd.push(`=name=${data.name}`);
    if (data.localAddress !== undefined) cmd.push(`=local-address=${data.localAddress}`);
    if (data.remoteAddress !== undefined) cmd.push(`=remote-address=${data.remoteAddress}`);
    if (data.rateLimit !== undefined) cmd.push(`=rate-limit=${data.rateLimit}`);
    await client.write(cmd);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function deletePppoeProfile(id: string, routerId?: number): Promise<void> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    await client.write([
      "/ppp/profile/remove",
      `=.id=${id}`,
    ]);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function disconnectPppoeActive(id: string, routerId?: number): Promise<void> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    await client.write([
      "/ppp/active/remove",
      `=.id=${id}`,
    ]);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function rebootRouter(routerId?: number): Promise<void> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    await client.write("/system/reboot");
  } catch {
    // Connection closing is expected during reboot command
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function getPppoeTraffic(username: string, routerId?: number): Promise<{ rxBps: number; txBps: number; bytesIn?: number; bytesOut?: number } | null> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    
    // First, get the interface stats to get bytes
    const ifaceName = `<pppoe-${username}>`;
    const ifaces = await client.write([
      "/interface/print",
      `?name=${ifaceName}`
    ]);
    
    if (!ifaces || ifaces.length === 0) return null;
    
    const iface = ifaces[0] as any;
    const bytesIn = parseInt(iface["rx-byte"] || "0");  // Router RX = Client Upload
    const bytesOut = parseInt(iface["tx-byte"] || "0"); // Router TX = Client Download

    const stats = await client.write([
      "/interface/monitor-traffic",
      `=interface=${ifaceName}`,
      "=once=",
    ]);
    const s = stats[0] as any;
    if (s) {
      return {
        rxBps: parseInt(s["rx-bits-per-second"] || "0"),
        txBps: parseInt(s["tx-bits-per-second"] || "0"),
        bytesIn,
        bytesOut
      };
    }
    return { rxBps: 0, txBps: 0, bytesIn, bytesOut };
  } catch (err) {
    console.warn("getPppoeTraffic error:", err);
    try {
      const client2 = await getClient(routerId);
      await client2.connect();
      const stats = await client2.write([
        "/interface/monitor-traffic",
        `=interface=<pppoe-${username}>`,
        "=once=",
      ]);
      await client2.close();
      const s = stats[0] as any;
      if (s) {
        return {
          rxBps: parseInt(s["rx-bits-per-second"] || "0"),
          txBps: parseInt(s["tx-bits-per-second"] || "0"),
        };
      }
    } catch (err2) {
      console.warn("getPppoeTraffic fallback error:", err2);
    }
    return null;
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

// (System resource helper is defined earlier to avoid duplicate definitions)

// ───── Health check ───────────────────────────────────────

export async function testConnection(routerId?: number): Promise<{ ok: boolean; version?: string; error?: string }> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const data = await client.write("/system/resource/print");
    try {
      await client.close();
    } catch {}
    return { ok: true, version: (data[0] as any)?.version };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ───── Unified Router Details (Single Connection Fetch) ─────

export async function getRouterDetails(routerId?: number): Promise<{
  secrets: PppoeSecret[];
  active: PppoeActive[];
  profiles: PppoeProfile[];
  status: { ok: boolean; version?: string; error?: string };
}> {
  const client = await getClient(routerId);
  try {
    await client.connect();
    const secretsData = await client.write("/ppp/secret/print");
    const activeData = await client.write("/ppp/active/print");
    const profilesData = await client.write("/ppp/profile/print");
    const resourceData = await client.write("/system/resource/print");

    return {
      secrets: secretsData as unknown as PppoeSecret[],
      active: activeData as unknown as PppoeActive[],
      profiles: profilesData as unknown as PppoeProfile[],
      status: { ok: true, version: (resourceData[0] as any)?.version },
    };
  } catch (err) {
    console.warn("getRouterDetails error:", String(err));
    return {
      secrets: [],
      active: [],
      profiles: [],
      status: { ok: false, error: String(err) },
    };
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

// Try to find a device by IP or MAC on a single router (ARP table, DHCP leases)
export async function findDeviceOnRouter(routerId: number, opts: { ip?: string; mac?: string }): Promise<any | null> {
  const client = await getClient(routerId);
  try {
    await client.connect();

    const ip = opts.ip?.toLowerCase();
    const mac = opts.mac?.toLowerCase()?.replace(/[:\-]/g, "");

    // Check ARP table
    try {
      const arp = await client.write(["/ip/arp/print"]);
      for (const row of arp as any[]) {
        const rowIp = String(row.address || "").toLowerCase();
        const rowMac = String(row.mac || "").toLowerCase().replace(/[:\-]/g, "");
        if ((ip && rowIp === ip) || (mac && rowMac === mac)) {
          return { type: 'arp', routerId, entry: row };
        }
      }
    } catch (e) {
      // ignore
    }

    // Check DHCP leases
    try {
      const leases = await client.write(["/ip/dhcp-server/lease/print"]);
      for (const l of leases as any[]) {
        const lIp = String(l.address || "").toLowerCase();
        const lMac = String(l["mac-address"] || l.mac || "").toLowerCase().replace(/[:\-]/g, "");
        if ((ip && lIp === ip) || (mac && lMac === mac)) {
          return { type: 'dhcp-lease', routerId, entry: l };
        }
      }
    } catch (e) {
      // ignore
    }

    // Check wireless registration (for wireless routers)
    try {
      const reg = await client.write(["/interface/wireless/registration-table/print"]);
      for (const r of reg as any[]) {
        const rMac = String(r.mac || "").toLowerCase().replace(/[:\-]/g, "");
        const rIp = String(r.address || "").toLowerCase();
        if ((ip && rIp === ip) || (mac && rMac === mac)) {
          return { type: 'wireless-reg', routerId, entry: r };
        }
      }
    } catch (e) {
      // ignore
    }

    return null;
  } catch (err) {
    console.warn('findDeviceOnRouter error:', err);
    return null;
  } finally {
    try { await client.close(); } catch {}
  }
}

// Search across all configured mikrotik routers and return first hit with router metadata
export async function findDeviceAcrossRouters(opts: { ip?: string; mac?: string }): Promise<any | null> {
  // Load routers from DB
  const { db } = await import('@/db');
  const { mikrotiks } = await import('@/db/schema');
  try {
    const routers = await db.query.mikrotiks.findMany();
    for (const r of routers) {
      try {
        const hit = await findDeviceOnRouter(r.id, opts);
        if (hit) {
          return { router: r, hit };
        }
      } catch (e) {
        // continue to next router
        console.warn(`Error scanning router ${r.id}`, e);
      }
    }
  } catch (err) {
    console.warn('findDeviceAcrossRouters error:', err);
  }
  return null;
}

export async function suspendUsers(
  usersToSuspend: { pppoeUsername?: string | null; ipAddress?: string | null; type?: string | null }[], 
  routerId?: number
): Promise<void> {
  if (usersToSuspend.length === 0) return;
  
  const maxRetries = 3;
  let attempt = 0;
  let success = false;

  while (attempt < maxRetries && !success) {
    attempt++;
    const client = await getClient(routerId);
    try {
      await client.connect();
      const secrets = await client.write("/ppp/secret/print") as any[];
      const active = await client.write("/ppp/active/print") as any[];

      for (const u of usersToSuspend) {
        // 1. Handle PPPoE Users
        if (u.type !== "static" && u.pppoeUsername) {
          const username = u.pppoeUsername.toLowerCase();
          const secret = secrets.find((s: any) => s.name.toLowerCase() === username);
          
          if (secret) {
            try {
              // Disable the user completely to ensure they cannot connect and bypass internet blockage
              await client.write([
                "/ppp/secret/set",
                `=.id=${secret[".id"]}`,
                "=profile=Expired",
                "=disabled=yes", // Block them entirely to prevent free internet access
              ]);
            } catch (e) {
              console.warn(`Failed to update profile to Expired for ${username}:`, e);
            }
          }
          
          // Force kick any active session
          const sessions = active.filter((s: any) => s.name.toLowerCase() === username);
          for (const session of sessions) {
            try {
              await client.write([
                "/ppp/active/remove",
                `=.id=${session[".id"]}`,
              ]);
              console.log(`Successfully kicked active session for ${username}`);
            } catch (e) {
              console.warn(`Failed to remove active session for ${username}:`, e);
            }
          }
        }

        // 2. Handle Static IP Users
        if (u.type === "static" && u.ipAddress) {
          try {
            // First check if already exists in the address list
            const addressLists = await client.write([
              "/ip/firewall/address-list/print",
              `?list=expired-customers`,
              `?address=${u.ipAddress}`
            ]) as any[];

            if (addressLists.length === 0) {
              await client.write([
                "/ip/firewall/address-list/add",
                "=list=expired-customers",
                `=address=${u.ipAddress}`,
                `=comment=Expired User: ${u.pppoeUsername || u.ipAddress}`
              ]);
              console.log(`Successfully added static IP ${u.ipAddress} to expired-customers list`);
            }
          } catch (e) {
            console.warn(`Failed to add static IP ${u.ipAddress} to firewall for suspension:`, e);
          }
        }
      }
      
      success = true; // All operations succeeded
    } catch (err) {
      console.warn(`[Attempt ${attempt}/${maxRetries}] suspendUsers error:`, err);
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    } finally {
      try {
        await client.close();
      } catch {}
    }
  }

  if (!success) {
    console.error(`🚨 CRITICAL: suspendUsers failed after ${maxRetries} attempts on router ${routerId}`);
    throw new Error(`suspendUsers failed after ${maxRetries} attempts`);
  }
}

}

export async function unsuspendStaticUsers(
  usersToUnsuspend: { ipAddress?: string | null }[], 
  routerId?: number
): Promise<void> {
  if (usersToUnsuspend.length === 0) return;
  
  const client = await getClient(routerId);
  try {
    await client.connect();
    for (const u of usersToUnsuspend) {
      if (u.ipAddress) {
        try {
          const addressLists = await client.write([
            "/ip/firewall/address-list/print",
            `?list=expired-customers`,
            `?address=${u.ipAddress}`
          ]) as any[];

          for (const item of addressLists) {
            await client.write([
              "/ip/firewall/address-list/remove",
              `=.id=${item[".id"]}`
            ]);
            console.log(`Successfully removed static IP ${u.ipAddress} from expired-customers list`);
          }
        } catch (e) {
          console.warn(`Failed to remove static IP ${u.ipAddress} from firewall:`, e);
        }
      }
    }
  } catch (err) {
    console.warn(`unsuspendStaticUsers error:`, err);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}
