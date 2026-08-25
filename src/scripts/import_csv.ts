import fs from "fs";
import path from "path";
import Papa from "papaparse";
import bcrypt from "bcryptjs";
import { db } from "../db/index";
import { users, packages, mikrotiks } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Starting CSV import...");
    const csvFilePath = path.join(__dirname, "../../src/Customer_List_All_Status_7_21_2026.csv");
    
    if (!fs.existsSync(csvFilePath)) {
        console.error("CSV file not found at", csvFilePath);
        process.exit(1);
    }
    
    const csvFile = fs.readFileSync(csvFilePath, "utf8");

    const parsed = Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
    });

    console.log(`Found ${parsed.data.length} records in CSV.`);

    const packageMap = new Map();
    let defaultMikrotik = await db.select().from(mikrotiks).where(eq(mikrotiks.name, "Mikrotik_01")).limit(1);
    let mikrotikId;
    if (defaultMikrotik.length === 0) {
        const res = await db.insert(mikrotiks).values({
            name: "Mikrotik_01",
            ipAddress: "127.0.0.1",
            username: "admin",
            password: "password",
        }).returning({ id: mikrotiks.id });
        mikrotikId = res[0].id;
    } else {
        mikrotikId = defaultMikrotik[0].id;
    }

    let imported = 0;

    for (const row of parsed.data as any[]) {
        try {
            const customerId = row["Cust ID"];
            const name = row["Customer Name"] || `Customer ${customerId}`;
            const pppoeName = row["PPPoE User"];
            const address = row["Address"] === "N/A" ? "" : row["Address"];
            let phone = row["Phone"];
            if (!phone || phone.trim() === "") {
                phone = `0000000000${customerId || Math.floor(Math.random()*1000)}`;
            }
            
            const plainPassword = "password123";
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            
            let statusStr = row["Connection"]; // ONLINE / OFFLINE
            const status = (statusStr && statusStr.toUpperCase() === "ONLINE") ? "online" : "offline";
            
            const balanceStr = row["Balance"] ? row["Balance"].replace(/[^0-9.-]+/g, "") : "0";
            const balance = parseFloat(balanceStr) || 0;
            const expireDateStr = row["Expire Date"];
            let expireDate = null;
            if (expireDateStr) {
                expireDate = new Date(expireDateStr);
            }
            
            const bandwidth = row["Package"]; // e.g. 10M-POOL
            const priceStr = row["Price"] ? row["Price"].replace(/[^0-9.-]+/g, "") : "0";
            const price = parseFloat(priceStr) || 0;

            let packageId = null;
            if (bandwidth && bandwidth.trim() !== "") {
                const pkgKey = `${bandwidth}-${price}`;
                if (packageMap.has(pkgKey)) {
                    packageId = packageMap.get(pkgKey);
                } else {
                    let pkg = await db.select().from(packages).where(eq(packages.name, bandwidth)).limit(1);
                    if (pkg.length === 0) {
                        const newPkg = await db.insert(packages).values({
                            name: bandwidth,
                            speed: bandwidth,
                            price: price.toString(),
                        }).returning({ id: packages.id });
                        packageId = newPkg[0].id;
                    } else {
                        packageId = pkg[0].id;
                    }
                    packageMap.set(pkgKey, packageId);
                }
            }

            const existingPhone = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
            let existingUsername = [];
            if (pppoeName && pppoeName.trim() !== "") {
                 existingUsername = await db.select().from(users).where(eq(users.pppoeUsername, pppoeName)).limit(1);
            }
            if (existingPhone.length === 0 && existingUsername.length === 0) {
                await db.insert(users).values({
                    name,
                    phone,
                    password: hashedPassword,
                    plainPassword,
                    address,
                    pppoeUsername: pppoeName,
                    mikrotikId,
                    packageId,
                    status,
                    balance: balance.toString(),
                    expireDate,
                    role: "customer",
                    customerType: "pppoe"
                });
                imported++;
            } else {
                console.log(`Skipping duplicate user: ${pppoeName || phone}`);
            }
        } catch (e) {
            console.error(`Error importing row:`, row, e);
        }
    }

    console.log(`Finished importing ${imported} users!`);
    process.exit(0);
}

main().catch(console.error);
