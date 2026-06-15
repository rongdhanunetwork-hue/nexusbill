import { NextResponse } from "next/server";

const cache: Record<string, string> = {};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mac = searchParams.get("mac");
  
  if (!mac) {
    return NextResponse.json({ error: "MAC address required" }, { status: 400 });
  }

  // Normalize MAC to uppercase
  const normalizedMac = mac.toUpperCase().trim();

  // Check cache
  if (cache[normalizedMac]) {
    return NextResponse.json({ vendor: cache[normalizedMac] });
  }

  try {
    // We use api.macvendors.com to resolve the OUI
    const res = await fetch(`https://api.macvendors.com/${encodeURIComponent(normalizedMac)}`);
    
    if (!res.ok) {
      return NextResponse.json({ vendor: "Unknown" });
    }
    
    const vendor = await res.text();
    if (vendor && !vendor.includes("Not Found")) {
      // Save to cache
      cache[normalizedMac] = vendor;
      return NextResponse.json({ vendor });
    }
    
    return NextResponse.json({ vendor: "Unknown" });
  } catch (error) {
    console.error("MAC Vendor lookup failed:", error);
    return NextResponse.json({ vendor: "Unknown" });
  }
}
