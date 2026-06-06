import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, mikrotiks, packages, areas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, getAdminIdForSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// Simple state-machine CSV parser that handles double quotes, commas, and newlines.
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let cell = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) lines.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some(Boolean)) lines.push(row);
  }
  return lines;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminId = await getAdminIdForSession(session);
    const body = await req.json();
    const { csvText } = body;

    if (!csvText) {
      return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV must contain headers and at least one data row" }, { status: 400 });
    }

    // Normalize header: lowercase, strip all non-alphanumeric
    const norm = (h: string) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const headers = rows[0].map(norm);

    const nameIdx     = headers.findIndex(h => ['name','customername','fullname','clientname','customer','nameofclient','clientfullname','subscribername'].includes(h));
    const phoneIdx    = headers.findIndex(h => ['phone','phonenumber','mobile','mobilenumber','cell','cellphone','contact','contactnumber','clientphone','customerphone','mobilephone'].includes(h));
    const usernameIdx = headers.findIndex(h => ['pppoeusername','username','pppoeuser','user','pppoe','loginid','login','userid','id','pppoename','pppoelogin','pppid','clientid','customerid','pppoeid'].includes(h));
    const passwordIdx = headers.findIndex(h => ['password','pppoepassword','pass','passwd','pppoepass'].includes(h));
    const addressIdx  = headers.findIndex(h => ['address','customeraddress','addr','location','village','addressofclient','clientaddress','customeraddr'].includes(h));
    const packageIdx  = headers.findIndex(h => ['package','packagename','plan','planname','service','bandwidth','bandwidthallocationmb','speed','packageplan','sellingbandwidthbdtexcludingvat'].includes(h));
    const areaIdx     = headers.findIndex(h => ['area','areaname','zone','box','polebox','subarea','sector','locality'].includes(h));
    const discountIdx = headers.findIndex(h => ['discount','billdiscount','discountamount'].includes(h));
    const macIdx      = headers.findIndex(h => ['onumac','mac','onumacaddress','macaddress','onu'].includes(h));
    const typeIdx     = headers.findIndex(h => ['connectiontype','clienttype','type','conntype','servicetype','usertype'].includes(h));
    const statusIdx   = headers.findIndex(h => ['status','customerstatus','accountstatus','paymentstatus'].includes(h));
    const emailIdx    = headers.findIndex(h => ['email','emailaddress','mail'].includes(h));
    const balanceIdx  = headers.findIndex(h => ['balance','accountbalance','walletbalance','due'].includes(h));
    const activationIdx = headers.findIndex(h => ['activationdate','startdate','joindate','joiningdate','connectiondate'].includes(h));

    if (usernameIdx === -1) {
      const found = rows[0].join(', ');
      return NextResponse.json({
        error: `Required column not found. Need one of: 'PPPoE Username', 'PPPoE_Name', 'Username', 'User'. Your columns: ${found}`
      }, { status: 400 });
    }

    // Pre-fetch lookup data
    const [dbPackages, dbAreas] = await Promise.all([
      db.query.packages.findMany({ where: eq(packages.adminId, adminId) }),
      db.query.areas.findMany({ where: eq(areas.adminId, adminId) }),
    ]);

    // Build a live map of existing customers by pppoeUsername
    const existingCustomers = await db.query.users.findMany({
      where: and(eq(users.role, "customer"), eq(users.adminId, adminId))
    });
    const existingMap = new Map<string, typeof existingCustomers[0]>();
    for (const c of existingCustomers) {
      if (c.pppoeUsername) {
        existingMap.set(c.pppoeUsername.toLowerCase().trim(), c);
      }
    }

    // Track phones used in this import and avoid duplicates
    const usedPhones = new Set<string>(
      existingCustomers.map(c => c.phone?.toLowerCase().trim()).filter(Boolean) as string[]
    );
    const processedUsernames = new Set<string>();

    // Get default router for new users
    const defaultRouter = await db.query.mikrotiks.findFirst({
      where: and(eq(mikrotiks.adminId, adminId), eq(mikrotiks.status, true))
    });

    // Pre-cleanup: Remove duplicate customers with same pppoeUsername (keep latest)
    const duplicateCleanup = await db.query.users.findMany({
      where: and(eq(users.role, "customer"), eq(users.adminId, adminId))
    });
    const pppoeMap = new Map<string, (typeof duplicateCleanup)[0][]>();
    for (const u of duplicateCleanup) {
      if (u.pppoeUsername) {
        const key = u.pppoeUsername.toLowerCase().trim();
        if (!pppoeMap.has(key)) pppoeMap.set(key, []);
        pppoeMap.get(key)!.push(u);
      }
    }
    for (const [key, dupes] of pppoeMap) {
      if (dupes.length > 1) {
        dupes.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        const keepId = dupes[0].id;
        for (let i = 1; i < dupes.length; i++) {
          await db.delete(users).where(eq(users.id, dupes[i].id)).catch(() => {});
        }
      }
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const username = usernameIdx < row.length && row[usernameIdx] ? row[usernameIdx].trim() : '';
      if (!username) continue;

      const usernameKey = username.toLowerCase().trim();

      if (processedUsernames.has(usernameKey)) {
        skippedCount++;
        errors.push(`Row ${r + 1} skipped because duplicate PPPoE username '${username}' was already imported in this file.`);
        continue;
      }

      processedUsernames.add(usernameKey);

      // Extract fields - only use values that actually exist in CSV
      const rawName    = nameIdx >= 0 && nameIdx < row.length ? row[nameIdx]?.trim() || '' : '';
      const rawPhone   = phoneIdx >= 0 && phoneIdx < row.length ? row[phoneIdx]?.trim() || '' : '';
      const password   = passwordIdx >= 0 && passwordIdx < row.length ? row[passwordIdx]?.trim() || 'password123' : 'password123';
      const address    = addressIdx >= 0 && addressIdx < row.length ? row[addressIdx]?.trim() || null : null;
      const rawPackage = packageIdx >= 0 && packageIdx < row.length ? row[packageIdx]?.trim() || '' : '';
      const rawArea    = areaIdx >= 0 && areaIdx < row.length ? row[areaIdx]?.trim() || '' : '';
      const discountVal = discountIdx >= 0 && discountIdx < row.length ? parseFloat(row[discountIdx]) || 0 : 0;
      const onuMac     = macIdx >= 0 && macIdx < row.length ? row[macIdx]?.trim() || null : null;
      const connectionType = typeIdx >= 0 && typeIdx < row.length ? row[typeIdx]?.trim()?.toLowerCase() || 'fiber' : 'fiber';
      const rawStatus  = statusIdx >= 0 && statusIdx < row.length ? row[statusIdx]?.trim()?.toLowerCase() || '' : '';
      const rawBalance = balanceIdx >= 0 && balanceIdx < row.length ? row[balanceIdx]?.trim() || '' : '';

      const name  = rawName || username;
      let phone = rawPhone || username;

      // Ensure unique phone
      const phoneKey = phone.toLowerCase().trim();
      if (usedPhones.has(phoneKey)) {
        const existingWithPhone = existingCustomers.find(c => c.phone?.toLowerCase() === phoneKey);
        if (!existingWithPhone || existingWithPhone.pppoeUsername?.toLowerCase() !== usernameKey) {
          phone = `${username}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 45);
          if (usedPhones.has(phone.toLowerCase())) {
            phone = `${phone}-${r}`;
          }
        }
      }

      // Match Package by name
      let packageId: number | null = null;
      if (rawPackage) {
        const matchedPkg = dbPackages.find(p => p.name.toLowerCase().trim() === rawPackage.toLowerCase().trim());
        if (matchedPkg) packageId = matchedPkg.id;
      }

      // Match Area by name
      let areaId: number | null = null;
      if (rawArea) {
        const matchedArea = dbAreas.find(a => a.name.toLowerCase().trim() === rawArea.toLowerCase().trim());
        if (matchedArea) areaId = matchedArea.id;
      }

      try {
        const existing = existingMap.get(usernameKey);

        if (existing) {
          // ── UPDATE existing customer — only non-empty fields ──
          const updatePayload: Record<string, any> = {};

          if (rawName && rawName !== existing.name)  updatePayload.name = name;
          if (rawPhone && rawPhone !== existing.phone) updatePayload.phone = phone;
          if (address && address !== existing.address) updatePayload.address = address;
          if (discountVal > 0) updatePayload.discount = discountVal.toFixed(2);
          if (onuMac && onuMac !== existing.onuMac) updatePayload.onuMac = onuMac;
          if (packageId && packageId !== existing.packageId) updatePayload.packageId = packageId;
          if (areaId && areaId !== existing.areaId) updatePayload.areaId = areaId;
          if (rawBalance) {
            const bal = parseFloat(rawBalance);
            if (!isNaN(bal)) updatePayload.balance = bal.toFixed(2);
          }
          // Always ensure pppoeUsername is set
          if (!existing.pppoeUsername || existing.pppoeUsername !== username) {
            updatePayload.pppoeUsername = username;
          }

          if (Object.keys(updatePayload).length > 0) {
            await db.update(users).set(updatePayload).where(eq(users.id, existing.id));
            updatedCount++;
            existingMap.set(usernameKey, { ...existing, ...updatePayload } as any);
          } else {
            skippedCount++;
          }

          // Track the phone
          if (updatePayload.phone) usedPhones.add(updatePayload.phone.toLowerCase());

        } else {
          // ── INSERT new customer ──
          usedPhones.add(phone.toLowerCase());

          const hashedPassword = await bcrypt.hash(password, 12);
          const [insertedUser] = await db.insert(users).values({
            name,
            phone,
            password: hashedPassword,
            pppoeUsername: username,
            address,
            packageId,
            areaId,
            discount: discountVal.toFixed(2),
            onuMac,
            connectionType,
            status: "active",
            approvalStatus: "approved",
            role: "customer",
            adminId,
            mikrotikId: defaultRouter?.id || null,
          }).returning();

          existingMap.set(usernameKey, insertedUser as any);
          createdCount++;

          // NOTE: We intentionally do NOT call syncCustomerToMikrotik here.
          // Syncing one-by-one during bulk import causes massive timeouts.
          // Users already on MikroTik are already synced.
          // New users should be synced manually or via the auto-sync background process.
        }
      } catch (err: any) {
        errors.push(`Row ${r + 1} (${username}): ${err.message || String(err)}`);
      }
    }

    const message = `Import complete: ${updatedCount} updated, ${createdCount} new, ${skippedCount} skipped (no changes).${errors.length > 0 ? ` ${errors.length} errors.` : ''}`;
    return NextResponse.json({ success: true, createdCount, updatedCount, skippedCount, errors, message });

  } catch (err: any) {
    console.error("CSV Import error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
