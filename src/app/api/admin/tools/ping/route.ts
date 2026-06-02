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

    // Ping command: -w 500 sets timeout to 500ms per reply. -W 1 for Linux.
    let command = process.platform === "win32" ? `ping -n 4 -w 500 ${ip}` : `ping -c 4 -W 1 ${ip}`;
    
    try {
      const { stdout } = await execAsync(command);
      return NextResponse.json({ result: stdout });
    } catch (err: any) {
      // If ping fails (e.g. timeout or host unreachable), exec throws an error but we still want stdout
      return NextResponse.json({ result: err.stdout || err.message });
    }
    
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
