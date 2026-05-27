import { db } from "@/db";
import { users, mikrotiks, packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { 
  getPppoeSecrets, 
  getPppoeActive, 
  createPppoeSecret, 
  updatePppoeSecret, 
  deletePppoeSecret, 
  getPppoeProfiles,
  PppoeSecret
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
