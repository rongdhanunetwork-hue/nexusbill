import { getSystemResource } from './src/lib/mikrotik.js';

async function test() {
  console.log("Fetching system resource for router 2...");
  const res = await getSystemResource(2);
  console.log("Result:", res);
  process.exit(0);
}

test().catch(console.error);
