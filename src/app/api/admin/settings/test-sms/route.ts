import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ success: false, error: "Phone number required" });
    }

    const result = await sendSMS(
      phone,
      "এটি একটি পরীক্ষামূলক SMS। আপনার ISP Billing সিস্টেম সঠিকভাবে কাজ করছে। ধন্যবাদ।"
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
