import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getSession } from "@/lib/auth";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "reseller" && session.role !== "employee")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ip } = await req.json();
    
    if (!ip || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
      return NextResponse.json({ error: "Valid IP address is required" }, { status: 400 });
    }

    // Windows uses tracert, Linux uses traceroute. Limit hops and timeout for faster response.
    let command = process.platform === "win32" ? `tracert -h 10 -w 300 ${ip}` : `traceroute -m 10 -w 1 ${ip}`;
    
    try {
      const { stdout } = await execAsync(command);
      return NextResponse.json({ result: stdout });
    } catch (err: any) {
      return NextResponse.json({ result: err.stdout || err.message });
    }
    
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
