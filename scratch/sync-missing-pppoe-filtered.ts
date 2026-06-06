import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getPppoeSecrets, createPppoeSecret } from '@/lib/mikrotik';

const RUN_DESTRUCTIVE = process.env.RUN_DESTRUCTIVE === 'true';

function isValidPhone(p?: string) {
  if (!p) return false;
  const cleaned = p.replace(/[^0-9]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 14;
}

function isPlaceholder(u: any) {
  const name = (u.name || '').trim();
  const phone = (u.phone || '').trim();
  const username = (u.pppoeUsername || '').trim();
  if (!username) return true;
  if (!name || name.length <= 2) return true;
  // if name equals username or phone equals username, consider placeholder
  if (name.toLowerCase() === username.toLowerCase()) return true;
  if (phone && phone === username) return true;
  // if phone invalid
  if (!isValidPhone(phone)) return true;
  return false;
}

async function main() {
  try {
    console.log('Filtered sync dry-run: only consider "complete" customers');
    const customers = await db.query.users.findMany({ where: eq(users.role, 'customer') });
    const routerSecrets = await getPppoeSecrets();
    const existingNames = new Set((routerSecrets || []).map(s => String(s.name).toLowerCase()));

    const candidates = customers.filter(c => c.pppoeUsername && !existingNames.has(c.pppoeUsername.toLowerCase().trim()) && !isPlaceholder(c));
    const placeholders = customers.filter(c => c.pppoeUsername && !existingNames.has(c.pppoeUsername.toLowerCase().trim()) && isPlaceholder(c));

    console.log('Total customers:', customers.length);
    console.log('Total PPPoE secrets on router:', routerSecrets.length);
    console.log('Missing on router (total):', customers.filter(c => c.pppoeUsername && !existingNames.has(c.pppoeUsername?.toLowerCase?.().trim?.())).length);
    console.log('Candidates (complete) missing on router:', candidates.length);
    console.log('Placeholders missing on router (skipped):', placeholders.length);

    console.log('\nSample candidates (first 20):');
    for (let i = 0; i < Math.min(20, candidates.length); i++) {
      const c = candidates[i];
      console.log(`  - id=${c.id} name=${c.name} phone=${c.phone} username=${c.pppoeUsername}`);
    }

    console.log('\nSample placeholders (first 20):');
    for (let i = 0; i < Math.min(20, placeholders.length); i++) {
      const c = placeholders[i];
      console.log(`  - id=${c.id} name=${c.name} phone=${c.phone} username=${c.pppoeUsername}`);
    }

    if (!RUN_DESTRUCTIVE) {
      console.log('\nDry-run complete. To create only for candidates, run with RUN_DESTRUCTIVE=true and this script will create PPPoE secrets for candidates only.');
      process.exit(0);
    }

    console.log('\nRUN_DESTRUCTIVE=true detected — creating PPPoE secrets for candidates...');
    let created = 0;
    for (const c of candidates) {
      try {
        const pwd = String(c.pppoeUsername).slice(0, 45) || String(c.phone || c.id).slice(0,45);
        await createPppoeSecret({ name: String(c.pppoeUsername), password: pwd, comment: `user_id=${c.id}` });
        created++;
        console.log(`  Created PPPoE: ${c.pppoeUsername} (user ${c.id})`);
        // small delay to avoid overwhelming router
        await new Promise(res => setTimeout(res, 150));
      } catch (err) {
        console.error(`  Failed to create ${c.pppoeUsername} (user ${c.id}):`, err?.message || err);
      }
    }

    console.log(`\nDone. Created ${created} PPPoE secrets.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
