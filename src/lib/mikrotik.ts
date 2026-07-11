import { db } from "@/db";
import { mikrotiks } from "@/db/schema";
import { eq } from "drizzle-orm";

// ───── Config ─────────────────────────────────────────────

interface RouterConfig {
  host: string;
  webPort: number;
  user: string;
  pass: string;
  timeout: number;
}

async function getRouterConfig(routerId?: number): Promise<RouterConfig> {
  if (routerId) {
    try {
      const router = await db.query.mikrotiks.findFirst({
        where: eq(mikrotiks.id, routerId),
      });
      if (router) {
        return {
          host: router.ipAddress,
          webPort: router.webPort || 8080,
          user: router.username,
          pass: router.password,
          timeout: parseInt(process.env.MIKROTIK_API_TIMEOUT || '30'),
        };
      }
    } catch (err) {
      console.warn(`Failed to load router config for ID ${routerId}:`, err);
    }
  }
  return {
    host: process.env.MIKROTIK_HOST || "bd2.mikrovpn.xyz",
    webPort: parseInt(process.env.MIKROTIK_WEB_PORT || "8080"),
    user: process.env.MIKROTIK_USER || "admin",
    pass: process.env.MIKROTIK_PASS || "admin",
    timeout: parseInt(process.env.MIKROTIK_API_TIMEOUT || '30'),
  };
}

// ───── REST API Client ────────────────────────────────────

async function mikrotikRest(
  config: RouterConfig,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const url = `http://${config.host}:${config.webPort}/rest${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${config.user}:${config.pass}`).toString('base64'),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout * 1000);

  try {
    const response = await fetch(url, {
      method,
      headers,
      ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`MikroTik REST error (${response.status}): ${errorText}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') return [];

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function restCall(
  routerId: number | undefined,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const config = await getRouterConfig(routerId);
  return mikrotikRest(config, method, path, body);
}

// ───── Types ─────────────────────────────────────────────

export interface PppoeSecret {
  ".id": string;
  name: string;
  password?: string;
  service?: string;
  profile?: string;
  disabled: string;
  comment?: string;
  [key: string]: any;
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

// ───── System Resource ────────────────────────────────────

export async function getSystemResource(routerId?: number): Promise<SystemResource | null> {
  try {
    const config = await getRouterConfig(routerId);
    const data = await mikrotikRest(config, 'GET', '/system/resource');

    const resource = Array.isArray(data) ? data[0] : data;
    if (!resource) return null;

    let maxTx = 0;
    let maxRx = 0;
    let maxTxPkts = 0;
    let maxRxPkts = 0;
    try {
      const ifaces = await mikrotikRest(config, 'POST', '/interface/print', {
        ".query": ["running=true"],
      });

      const validIfaces = (Array.isArray(ifaces) ? ifaces : []).filter((i: any) =>
        i.type !== "pppoe-in" && i.type !== "bridge" && !i.type?.includes("-in")
      );

      validIfaces.sort((a: any, b: any) => parseInt(b["rx-byte"] || "0") - parseInt(a["rx-byte"] || "0"));
      const topCandidates = validIfaces.slice(0, 5).map((i: any) => i.name).join(",");

      if (topCandidates.length > 0) {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Monitor traffic timeout")), 5000));
        const stats = await Promise.race([
          mikrotikRest(config, 'POST', '/interface/monitor-traffic', {
            interface: topCandidates,
            once: "",
          }),
          timeoutPromise
        ]);

        const statsArr = Array.isArray(stats) ? stats : [stats];
        let highestCurrentRx = -1;
        for (const s of statsArr as any[]) {
          const rx = parseInt(s["rx-bits-per-second"] || "0");
          const tx = parseInt(s["tx-bits-per-second"] || "0");
          const rxPkts = parseInt(s["rx-packets-per-second"] || "0");
          const txPkts = parseInt(s["tx-packets-per-second"] || "0");

          if (rx > highestCurrentRx) {
            highestCurrentRx = rx;
            maxRx = rx;
            maxTx = tx;
            maxRxPkts = rxPkts;
            maxTxPkts = txPkts;
          }
        }
      }
    } catch (trafficErr) {
      console.error("Traffic calc error:", trafficErr);
    }

    const res = resource as unknown as SystemResource;
    res.rxBps = maxRx;
    res.txBps = maxTx;
    res.rxPps = maxRxPkts;
    res.txPps = maxTxPkts;
    return res;
  } catch (err) {
    console.warn('getSystemResource error:', err);
    return null;
  }
}

// ───── PPPoE Secrets (user accounts) ─────────────────────

export async function getPppoeSecrets(routerId?: number): Promise<PppoeSecret[]> {
  try {
    const data = await restCall(routerId, 'GET', '/ppp/secret');
    return (Array.isArray(data) ? data : []) as PppoeSecret[];
  } catch (err) {
    console.warn('getPppoeSecrets error:', err);
    throw err;
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
  const body: Record<string, string> = {
    name: data.name,
    password: data.password,
    service: data.service || "pppoe",
    profile: data.profile || "default",
    comment: data.comment || "",
  };
  if (data.disabled !== undefined) {
    body.disabled = (data.disabled === "true" || data.disabled === "yes" || data.disabled === true) ? "yes" : "no";
  }

  const result = await restCall(routerId, 'PUT', '/ppp/secret', body);
  return (Array.isArray(result) ? result[0] : result) as PppoeSecret;
}

export async function updatePppoeSecret(id: string, data: Partial<PppoeSecret>, routerId?: number): Promise<void> {
  const body: Record<string, any> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.password !== undefined) body.password = data.password;
  if (data.profile !== undefined) body.profile = data.profile;
  if (data.comment !== undefined) body.comment = data.comment;
  if (data.disabled !== undefined) {
    body.disabled = (data.disabled === "true" || data.disabled === "yes" || (data.disabled as any) === true) ? "true" : "false";
  }

  // Use standard REST PATCH for updates
  await restCall(routerId, 'PATCH', `/ppp/secret/${id}`, body);
}

export async function deletePppoeSecret(id: string, routerId?: number): Promise<void> {
  // Use standard REST DELETE
  await restCall(routerId, 'DELETE', `/ppp/secret/${id}`);
}

export async function enablePppoeSecret(id: string, routerId?: number): Promise<void> {
  await restCall(routerId, 'PATCH', `/ppp/secret/${id.replace('*', '%2A')}`, { disabled: "false" });
}

export async function disablePppoeSecret(id: string, routerId?: number): Promise<void> {
  await restCall(routerId, 'PATCH', `/ppp/secret/${id.replace('*', '%2A')}`, { disabled: "true" });
}

// ───── Active PPPoE Sessions (currently online) ──────────

export async function getPppoeActive(routerId?: number): Promise<PppoeActive[]> {
  try {
    const data = await restCall(routerId, 'GET', '/ppp/active');
    return (Array.isArray(data) ? data : []) as PppoeActive[];
  } catch (err) {
    console.warn('getPppoeActive error:', err);
    throw err;
  }
}

export async function getPppoeInterfaces(routerId?: number): Promise<any[]> {
  try {
    const data = await restCall(routerId, 'POST', '/interface/print', {
      ".query": ["type=pppoe-in"],
    });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('getPppoeInterfaces error:', err);
    throw err;
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
  try {
    const data = await restCall(routerId, 'GET', '/ppp/profile');
    return (Array.isArray(data) ? data : []) as PppoeProfile[];
  } catch (err) {
    console.warn('getPppoeProfiles error:', err);
    throw err;
  }
}

export async function createPppoeProfile(data: {
  name: string;
  localAddress?: string;
  remoteAddress?: string;
  rateLimit?: string;
}, routerId?: number): Promise<PppoeProfile> {
  const body: Record<string, string> = { name: data.name, "only-one": "yes" };
  if (data.localAddress) body["local-address"] = data.localAddress;
  if (data.remoteAddress) body["remote-address"] = data.remoteAddress;
  if (data.rateLimit) body["rate-limit"] = data.rateLimit;

  const result = await restCall(routerId, 'PUT', '/ppp/profile', body);
  return (Array.isArray(result) ? result[0] : result) as PppoeProfile;
}

export async function updatePppoeProfile(id: string, data: {
  name?: string;
  localAddress?: string;
  remoteAddress?: string;
  rateLimit?: string;
}, routerId?: number): Promise<void> {
  const body: Record<string, string> = {};
  if (data.name) body.name = data.name;
  if (data.localAddress !== undefined) body["local-address"] = data.localAddress;
  if (data.remoteAddress !== undefined) body["remote-address"] = data.remoteAddress;
  if (data.rateLimit !== undefined) body["rate-limit"] = data.rateLimit;

  await restCall(routerId, 'PATCH', `/ppp/profile/${id.replace('*', '%2A')}`, body);
}

export async function deletePppoeProfile(id: string, routerId?: number): Promise<void> {
  await restCall(routerId, 'DELETE', `/ppp/profile/${id.replace('*', '%2A')}`);
}

// ───── Session Management ─────────────────────────────────

export async function disconnectPppoeActive(id: string, routerId?: number): Promise<void> {
  await restCall(routerId, 'DELETE', `/ppp/active/${id}`);
}

export async function rebootRouter(routerId?: number): Promise<void> {
  try {
    await restCall(routerId, 'POST', '/system/reboot', {});
  } catch { }
}

// ───── Traffic Monitoring ─────────────────────────────────

export async function getPppoeTraffic(username: string, routerId?: number): Promise<{ rxBps: number; txBps: number; bytesIn?: number; bytesOut?: number } | null> {
  try {
    const config = await getRouterConfig(routerId);
    const ifaceName = `<pppoe-${username}>`;
    const ifaces = await mikrotikRest(config, 'POST', '/interface/print', {
      ".query": [`name=${ifaceName}`],
    });

    if (!ifaces || !Array.isArray(ifaces) || ifaces.length === 0) return null;

    const iface = ifaces[0] as any;
    const bytesIn = parseInt(iface["rx-byte"] || "0");
    const bytesOut = parseInt(iface["tx-byte"] || "0");

    try {
      const stats = await mikrotikRest(config, 'POST', '/interface/monitor-traffic', {
        interface: ifaceName,
        once: "",
      });

      const s = Array.isArray(stats) ? stats[0] : stats;
      if (s) {
        return {
          rxBps: parseInt(s["rx-bits-per-second"] || "0"),
          txBps: parseInt(s["tx-bits-per-second"] || "0"),
          bytesIn,
          bytesOut
        };
      }
    } catch { }

    return { rxBps: 0, txBps: 0, bytesIn, bytesOut };
  } catch (err) {
    console.warn("getPppoeTraffic error:", err);
    return null;
  }
}

// ───── Health check ───────────────────────────────────────

export async function testConnection(routerId?: number): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const data = await restCall(routerId, 'GET', '/system/resource');
    const resource = Array.isArray(data) ? data[0] : data;
    return { ok: true, version: resource?.version };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ───── Unified Router Details ────────────────────────────

export async function getRouterDetails(routerId?: number): Promise<{
  secrets: PppoeSecret[];
  active: PppoeActive[];
  profiles: PppoeProfile[];
  status: { ok: boolean; version?: string; error?: string };
}> {
  try {
    const config = await getRouterConfig(routerId);

    const [secretsData, activeData, profilesData, resourceData] = await Promise.all([
      mikrotikRest(config, 'GET', '/ppp/secret').catch(() => []),
      mikrotikRest(config, 'GET', '/ppp/active').catch(() => []),
      mikrotikRest(config, 'GET', '/ppp/profile').catch(() => []),
      mikrotikRest(config, 'GET', '/system/resource').catch(() => []),
    ]);

    const resource = Array.isArray(resourceData) ? resourceData[0] : resourceData;

    return {
      secrets: (Array.isArray(secretsData) ? secretsData : []) as PppoeSecret[],
      active: (Array.isArray(activeData) ? activeData : []) as PppoeActive[],
      profiles: (Array.isArray(profilesData) ? profilesData : []) as PppoeProfile[],
      status: { ok: true, version: resource?.version },
    };
  } catch (err) {
    console.warn("getRouterDetails error:", String(err));
    return {
      secrets: [],
      active: [],
      profiles: [],
      status: { ok: false, error: String(err) },
    };
  }
}

// ───── Device Finder ──────────────────────────────────────

export async function findDeviceOnRouter(routerId: number, opts: { ip?: string; mac?: string }): Promise<any | null> {
  try {
    const config = await getRouterConfig(routerId);
    const ip = opts.ip?.toLowerCase();
    const mac = opts.mac?.toLowerCase()?.replace(/[:\-]/g, "");

    try {
      const arp = await mikrotikRest(config, 'GET', '/ip/arp');
      for (const row of (Array.isArray(arp) ? arp : []) as any[]) {
        const rowIp = String(row.address || "").toLowerCase();
        const rowMac = String(row["mac-address"] || "").toLowerCase().replace(/[:\-]/g, "");
        if ((ip && rowIp === ip) || (mac && rowMac === mac)) return { type: 'arp', routerId, entry: row };
      }
    } catch { }

    try {
      const leases = await mikrotikRest(config, 'GET', '/ip/dhcp-server/lease');
      for (const l of (Array.isArray(leases) ? leases : []) as any[]) {
        const lIp = String(l.address || "").toLowerCase();
        const lMac = String(l["mac-address"] || l.mac || "").toLowerCase().replace(/[:\-]/g, "");
        if ((ip && lIp === ip) || (mac && lMac === mac)) return { type: 'dhcp-lease', routerId, entry: l };
      }
    } catch { }

    try {
      const reg = await mikrotikRest(config, 'GET', '/interface/wireless/registration-table');
      for (const r of (Array.isArray(reg) ? reg : []) as any[]) {
        const rMac = String(r["mac-address"] || "").toLowerCase().replace(/[:\-]/g, "");
        const rIp = String(r.address || "").toLowerCase();
        if ((ip && rIp === ip) || (mac && rMac === mac)) return { type: 'wireless-reg', routerId, entry: r };
      }
    } catch { }

    return null;
  } catch (err) {
    console.warn('findDeviceOnRouter error:', err);
    return null;
  }
}

export async function findDeviceAcrossRouters(opts: { ip?: string; mac?: string }): Promise<any | null> {
  try {
    const routers = await db.query.mikrotiks.findMany();
    for (const r of routers) {
      try {
        const hit = await findDeviceOnRouter(r.id, opts);
        if (hit) return { router: r, hit };
      } catch (e) { }
    }
  } catch (err) { }
  return null;
}

// ───── Bulk Suspend ───────────────────────────────────────

export async function suspendUsers(
  usersToSuspend: { pppoeUsername?: string | null; ipAddress?: string | null; type?: string | null }[],
  routerId?: number
): Promise<void> {
  if (usersToSuspend.length === 0) return;
  const maxRetries = 3;
  let attempt = 0; let success = false;
  while (attempt < maxRetries && !success) {
    attempt++;
    try {
      const config = await getRouterConfig(routerId);
      const [secrets, active] = await Promise.all([
        mikrotikRest(config, 'GET', '/ppp/secret').catch(() => []),
        mikrotikRest(config, 'GET', '/ppp/active').catch(() => []),
      ]);
      const secretsArr = Array.isArray(secrets) ? secrets : [];
      const activeArr = Array.isArray(active) ? active : [];
      for (const u of usersToSuspend) {
        if (u.type !== "static" && u.pppoeUsername) {
          const username = u.pppoeUsername.toLowerCase();
          const secret = secretsArr.find((s: any) => s.name?.toLowerCase() === username);
          if (secret) {
            try { await mikrotikRest(config, 'PATCH', `/ppp/secret/${secret[".id"].replace('*', '%2A')}`, { profile: "Expired", disabled: "true" }); } catch (e) { console.warn("Error suspending secret:", e) }
          }
          const sessions = activeArr.filter((s: any) => s.name?.toLowerCase() === username);
          for (const session of sessions) {
            try { await mikrotikRest(config, 'DELETE', `/ppp/active/${session[".id"].replace('*', '%2A')}`); } catch (e) { console.warn("Error kicking session:", e) }
          }
        }
        if (u.type === "static" && u.ipAddress) {
          try {
            const addressLists = await mikrotikRest(config, 'POST', '/ip/firewall/address-list/print', { ".query": ["list=expired-customers", `address=${u.ipAddress}`] });
            const listArr = Array.isArray(addressLists) ? addressLists : [];
            if (listArr.length === 0) {
              await mikrotikRest(config, 'PUT', '/ip/firewall/address-list', { list: "expired-customers", address: u.ipAddress, comment: `Expired User: ${u.pppoeUsername || u.ipAddress}` });
            }
          } catch (e) { }
        }
      }
      success = true;
    } catch (err) {
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}
