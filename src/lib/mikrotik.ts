import { RouterOSAPI } from "node-routeros";

const MIKROTIK_HOST = process.env.MIKROTIK_HOST || "bd2.mikrovpn.xyz";
const MIKROTIK_API_PORT = process.env.MIKROTIK_API_PORT || "13065";
const MIKROTIK_USER = process.env.MIKROTIK_USER || "admin";
const MIKROTIK_PASS = process.env.MIKROTIK_PASS || "admin";

function getClient() {
  const client = new RouterOSAPI({
    host: MIKROTIK_HOST,
    port: parseInt(MIKROTIK_API_PORT),
    user: MIKROTIK_USER,
    password: MIKROTIK_PASS,
    timeout: 3,
  });
  client.on("error", (err) => {
    console.error("MikroTik socket error caught:", err);
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
}

// ───── PPPoE Secrets (user accounts) ─────────────────────

export async function getPppoeSecrets(): Promise<PppoeSecret[]> {
  const client = getClient();
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
}): Promise<PppoeSecret> {
  const client = getClient();
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
    const created = await client.write(cmd);
    return created[0] as unknown as PppoeSecret;
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

export async function updatePppoeSecret(id: string, data: Partial<PppoeSecret>): Promise<void> {
  const client = getClient();
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
      // In RouterOS API write, 'disabled' is yes/no
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

export async function deletePppoeSecret(id: string): Promise<void> {
  const client = getClient();
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

export async function enablePppoeSecret(id: string): Promise<void> {
  const client = getClient();
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

export async function disablePppoeSecret(id: string): Promise<void> {
  const client = getClient();
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

export async function getPppoeActive(): Promise<PppoeActive[]> {
  const client = getClient();
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

// ───── PPPoE Profiles ──────────────────────────────────────

export interface PppoeProfile {
  ".id": string;
  name: string;
  "local-address"?: string;
  "remote-address"?: string;
  "rate-limit"?: string;
  "only-one"?: string;
}

export async function getPppoeProfiles(): Promise<PppoeProfile[]> {
  const client = getClient();
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
}): Promise<PppoeProfile> {
  const client = getClient();
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
}): Promise<void> {
  const client = getClient();
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

export async function deletePppoeProfile(id: string): Promise<void> {
  const client = getClient();
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

export async function disconnectPppoeActive(id: string): Promise<void> {
  const client = getClient();
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

export async function rebootRouter(): Promise<void> {
  const client = getClient();
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

export async function getPppoeTraffic(username: string): Promise<{ rxBps: number; txBps: number; bytesIn?: number; bytesOut?: number } | null> {
  const client = getClient();
  try {
    await client.connect();
    // 1. Fetch active sessions to find dynamic interface name and cumulative traffic
    const actives = await client.write("/ppp/active/print");
    const activeSession = (actives as any[]).find(
      (s) => s.name.toLowerCase() === username.toLowerCase()
    );
    if (!activeSession) return null;

    const bytesIn = parseInt(activeSession["bytes-in"] || "0");
    const bytesOut = parseInt(activeSession["bytes-out"] || "0");

    // Interface is dynamic, e.g. <pppoe-username>
    const interfaceName = activeSession.interface || `<pppoe-${username}>`;

    // 2. Monitor traffic on that interface once
    const stats = await client.write([
      "/interface/monitor-traffic",
      `=interface=${interfaceName}`,
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
    console.error("getPppoeTraffic error:", err);
    // Fallback directly to <pppoe-username>
    try {
      const client2 = getClient();
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
      console.error("getPppoeTraffic fallback error:", err2);
    }
    return null;
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

// ───── System Resource ────────────────────────────────────

export async function getSystemResource(): Promise<SystemResource> {
  const client = getClient();
  try {
    await client.connect();
    const data = await client.write("/system/resource/print");
    return data[0] as unknown as SystemResource;
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

// ───── Health check ───────────────────────────────────────

export async function testConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
  const client = getClient();
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

export interface PppoeProfile {
  ".id": string;
  name: string;
  "local-address"?: string;
  "remote-address"?: string;
  "rate-limit"?: string;
  "only-one"?: string;
}

export async function getRouterDetails(): Promise<{
  secrets: PppoeSecret[];
  active: PppoeActive[];
  profiles: PppoeProfile[];
  status: { ok: boolean; version?: string; error?: string };
}> {
  const client = getClient();
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
    console.error("getRouterDetails error:", err);
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
