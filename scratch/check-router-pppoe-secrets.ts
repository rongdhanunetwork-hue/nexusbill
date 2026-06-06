import { getPppoeSecrets } from '@/lib/mikrotik';

async function main() {
  try {
    console.log('Connecting to MikroTik(s) to list PPPoE secrets...');
    const secrets = await getPppoeSecrets();
    if (!secrets) {
      console.log('No response or empty list from router.');
      process.exit(0);
    }
    console.log('Total PPPoE secrets on router:', secrets.length);
    console.log('Sample names (first 20):', secrets.slice(0,20).map(s => ({ name: s.name, disabled: s.disabled })));
  } catch (err) {
    console.error('Error fetching PPPoE secrets:', err);
    process.exit(1);
  }
}

main();
