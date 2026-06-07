import 'dotenv/config';
import { RouterOSAPI } from 'node-routeros';

// Simulate the new matching logic
function matchProfile(dbSpeed, routerProfiles) {
  const normSpeed = dbSpeed.toLowerCase().replace(/\s+/g, "");
  const speedNumber = dbSpeed.replace(/[^0-9]/g, "");
  
  // Strategy 1: Exact match
  const exactMatch = routerProfiles.find(p => p.name.toLowerCase() === normSpeed);
  if (exactMatch) return { match: exactMatch.name, strategy: "exact" };
  
  // Strategy 2: Number match  
  if (speedNumber) {
    const numberMatch = routerProfiles.find(p => {
      const pName = p.name.toLowerCase();
      if (pName === "default" || pName === "default-encryption" || pName === "expired" || pName === "block") return false;
      const profileNumber = p.name.replace(/[^0-9]/g, "");
      return profileNumber === speedNumber;
    });
    if (numberMatch) return { match: numberMatch.name, strategy: "number" };
  }
  
  return { match: null, strategy: "none" };
}

// Test with Router 1 (Main Router) - profiles: 5mbps, 10mbps, etc.
const router1Profiles = [
  { name: "default" }, { name: "5mbps" }, { name: "10mbps" }, { name: "15mbps" },
  { name: "20mbps" }, { name: "30mbps" }, { name: "50mbps" }, { name: "100mbps" },
  { name: "default-encryption" }
];

// Test with Router 2 (Rangdhanu.net) - profiles: 5M-POOL, 10M-POOL, etc.
const router2Profiles = [
  { name: "default" }, { name: "5M-POOL" }, { name: "7M-POOL" }, { name: "8M-POOL" },
  { name: "10M-POOL" }, { name: "15M-POOL" }, { name: "Expired" }, { name: "20M-POOL" },
  { name: "25M-POOL" }, { name: "30M-POOL" }, { name: "35M-POOL" }, { name: "40M-POOL" },
  { name: "45M-POOL" }, { name: "50M-POOL" }, { name: "Block" }, { name: "default-encryption" }
];

const testSpeeds = ["5 Mbps", "10 Mbps", "15 Mbps", "20 Mbps", "30 Mbps", "50 Mbps"];

console.log("=== Testing Profile Matching ===\n");

console.log("--- Router 1 (Main Router) ---");
for (const speed of testSpeeds) {
  const result = matchProfile(speed, router1Profiles);
  console.log(`  "${speed}" → ${result.match ? `✅ "${result.match}" (${result.strategy})` : '❌ NO MATCH'}`);
}

console.log("\n--- Router 2 (Rangdhanu.net) ---");
for (const speed of testSpeeds) {
  const result = matchProfile(speed, router2Profiles);
  console.log(`  "${speed}" → ${result.match ? `✅ "${result.match}" (${result.strategy})` : '❌ NO MATCH'}`);
}

process.exit(0);
