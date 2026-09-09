import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/sms";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ success: false, error: "Phone number is required" });
    }

    const result = await sendSMS(
      phone,
      "এটি একটি সুপারএডমিন টেস্ট SMS। আপনার ISP Billing সিস্টেমের SMS গেটওয়ে সফলভাবে কাজ করছে। ধন্যবাদ!"
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
